"""
Model routing simülasyonu, oturum düzeyinde.

Her varsayımın yanında [KAYNAK] ya da [VARSAYIM] etiketi var.
Kaynaklar README.md içinde listeli. Varsayımlar sensitivity.py ile oynatılıyor.
"""
import random, statistics as st
from dataclasses import dataclass, field

# ---------------------------------------------------------------- fiyatlar
# $ / 1M token. [KAYNAK] Anthropic API liste fiyatı, Ekim 2026
# cache okuma çarpanı [KAYNAK] prompt caching dokümanı:
#   varsayılan 0.1x, Opus 5.5 ve Sonnet 5.5 0.05x, Fable 5.1 0.025x
# cache yazma 5 dk TTL için 1.25x [KAYNAK] Opus 5.5 $5 yazma / $4 input
# Haiku 5.5, 100K üstü prompt'ta 5x [KAYNAK] Haiku 5.5 fiyat tablosu
PRICE = {
    "haiku":  dict(inp=0.10, out=0.50, cr=0.10, tier=True),
    "sonnet": dict(inp=2.0,  out=10.0, cr=0.05, tier=False),
    "opus":   dict(inp=4.0,  out=20.0, cr=0.05, tier=False),
    "fable":  dict(inp=10.0, out=50.0, cr=0.025, tier=False),
}
CW = 1.25

def rates(m, ctx):
    p = PRICE[m]; k = 5.0 if (p["tier"] and ctx > 100_000) else 1.0
    return p["inp"]*k, p["out"]*k, p["inp"]*k*p["cr"]

# ---------------------------------------------------------------- agentic adım modeli
SYS = 20_000            # [VARSAYIM] sistem prompt + tool tanımları + CLAUDE.md
TOOL_RESULT = 2_500     # [VARSAYIM] adım başı dosya/çıktı token'ı
STEP_OUT = 400          # [VARSAYIM] adım başı görünür çıktı
THINK = dict(low=300, med=1_200, high=3_000, max=8_000)   # [VARSAYIM] adım başı düşünme token'ı
# düşünme token'ı output olarak faturalanır [KAYNAK] Claude Code maliyet dokümanı
STEPS = dict(E=4, M=10, H=20)  # [VARSAYIM] görev başı tool turu
COMPACT_AT = 150_000    # [VARSAYIM] auto-compact eşiği
SUMMARY = 1_500         # [VARSAYIM] subagent'ın ana oturuma döndürdüğü özet
TASK_READ = 8_000       # [VARSAYIM] subagent'ın görevi anlamak için okuduğu ek bağlam

# ---------------------------------------------------------------- başarı olasılıkları
# [VARSAYIM] sıralama genel model kademesine göre, mutlak değerler tahmin.
P = {
 "E": {("haiku","low"):.90, ("haiku","high"):.94, ("haiku","max"):.95, ("sonnet","med"):.97, ("sonnet","high"):.98,
       ("opus","high"):.99, ("fable","high"):.99, ("fable","max"):.99},
 "M": {("haiku","low"):.45, ("haiku","high"):.62, ("haiku","max"):.72, ("sonnet","med"):.85, ("sonnet","high"):.90,
       ("opus","high"):.95, ("fable","high"):.97, ("fable","max"):.97},
 "H": {("haiku","low"):.08, ("haiku","high"):.15, ("haiku","max"):.22, ("sonnet","med"):.45, ("sonnet","high"):.55,
       ("opus","high"):.80, ("fable","high"):.88, ("fable","max"):.92},
}

# ---------------------------------------------------------------- kontrol katmanı
# catch = başarısız sonucu yakalama olasılığı. maliyet: test bedava, review sonnet çağrısı.
CONTROL = {
    "none":   dict(catch=0.00),
    "visual": dict(catch=0.60),   # [VARSAYIM] çalıştır ve bak. UI işinde test çoğu zaman yok [KAYNAK] Economic Index, saha çalışması
    "tests":  dict(catch=0.90),   # [VARSAYIM] test + typecheck + lint
}
REVIEW_CATCH = 0.70               # [VARSAYIM] testten kaçanın review ile yakalanma oranı
REVIEW_TOK = (12_000, 1_500)      # [VARSAYIM] sonnet review input/output

# ---------------------------------------------------------------- profiller
@dataclass
class Profile:
    name: str
    mix: dict              # zorluk dağılımı
    tasks_per_session: int # /clear alışkanlığı
    control: str
    step_scale: float = 1.0
    note: str = ""

PROFILES = [
    Profile("vibecoder", dict(E=.50, M=.35, H=.15), 12, "visual", 1.0,
            "UI ağırlıklı iş [KAYNAK EI], tek uzun oturum [KAYNAK maliyet dok.], test yok, kodu okumayabilir [KAYNAK vibe çalışması]"),
    Profile("indie dev",  dict(E=.40, M=.40, H=.20), 6, "visual", 1.0,
            "abonelikte, ara sıra /clear [VARSAYIM], typecheck var ama test sınırlı [VARSAYIM]"),
    Profile("pro dev",    dict(E=.35, M=.40, H=.25), 1, "tests", 0.6,
            "küçük adımlar, prompt başı medyan 1.8 adım [KAYNAK saha çalışması], testli repo, işler arası /clear [KAYNAK maliyet dok. önerisi]"),
    Profile("pipeline",   dict(E=.50, M=.35, H=.15), 1, "tests", 1.0,
            "API'de otomatik akış, her iş temiz context, CI testleri [VARSAYIM]"),
]

# ---------------------------------------------------------------- stratejiler
ROUTER_ACC = 0.80   # [VARSAYIM] router sınıflandırma isabeti; yanılınca bir kademe aşağı seçer
LADDER = [("haiku","low"), ("haiku","max"), ("sonnet","high"), ("opus","high"), ("fable","high")]
ROUTE = dict(E=("haiku","low"), M=("sonnet","med"), H=("opus","high"))
DOWN = dict(H="M", M="E", E="E")

STRATS = ["hepsi fable", "hepsi opus", "hepsi sonnet", "hepsi haiku", "haiku + kontrol", "routing"]
SINGLE = {"hepsi fable":("fable","max"), "hepsi opus":("opus","high"), "hepsi sonnet":("sonnet","high"), "hepsi haiku":("haiku","high")}

# ---------------------------------------------------------------- motor
@dataclass
class Acc:
    cost: float = 0.0
    ok: int = 0
    shipped_bug: int = 0
    gave_up: int = 0
    attempts: int = 0

class Session:
    def __init__(self, acc):
        self.acc = acc; self.ctx = SYS; self.model = None
    def _charge(self, m, cached, fresh, out):
        i, o, cr = rates(m, cached + fresh)
        self.acc.cost += (cached*cr + fresh*i*CW + out*o) / 1e6
    def run_main(self, m, e, steps):
        """ana oturumda adımlar. model değişirse cache baştan yazılır."""
        if self.model is not None and self.model != m:
            self._charge(m, 0, self.ctx, 0)          # cache kırıldı, tüm context yeniden yazılır
        self.model = m
        for _ in range(steps):
            out = STEP_OUT + THINK[e]
            self._charge(m, self.ctx, TOOL_RESULT, out)
            self.ctx += TOOL_RESULT + STEP_OUT       # düşünme context'te kalmaz [VARSAYIM]
            if self.ctx > COMPACT_AT:
                self._charge(m, self.ctx, 0, 8_000)  # compaction kendisi büyük bir istek [KAYNAK]
                self.ctx = SYS + 10_000
    def run_sub(self, m, e, steps):
        """subagent: temiz context, iş bitince ana oturuma sadece özet döner [KAYNAK subagent dok.]"""
        sub = Session(self.acc); sub.ctx = SYS + TASK_READ; sub.model = m
        sub._charge(m, 0, SYS + TASK_READ, 0)
        for _ in range(steps):
            out = STEP_OUT + THINK[e]
            sub._charge(m, sub.ctx, TOOL_RESULT, out)
            sub.ctx += TOOL_RESULT + STEP_OUT
        self.ctx += SUMMARY

def attempt(sess, how, m, e, d, prof, rng):
    steps = max(1, round(STEPS[d] * prof.step_scale))
    (sess.run_sub if how == "sub" else sess.run_main)(m, e, steps)
    sess.acc.attempts += 1
    return rng.random() < P[d][(m, e)]

def caught(control, rng, review=False):
    c = CONTROL[control]["catch"]
    if rng.random() < c: return True
    return review and rng.random() < REVIEW_CATCH

def run_task(strat, sess, d, prof, rng):
    acc = sess.acc
    if strat in SINGLE:
        m, e = SINGLE[strat]
        # alışılmış davranış: hata fark edilirse aynı modele "hâlâ bozuk" de [KAYNAK vibe çalışması, tekrar eden niyetler]
        for _ in range(3):
            if attempt(sess, "main", m, e, d, prof, rng): acc.ok += 1; return
            if not caught(prof.control, rng): acc.shipped_bug += 1; return
        acc.gave_up += 1; return

    control = prof.control
    if strat == "haiku + kontrol":
        for m, e in LADDER:
            if attempt(sess, "sub", m, e, d, prof, rng): acc.ok += 1; return
            if not caught(control, rng): acc.shipped_bug += 1; return
        acc.gave_up += 1; return

    if strat == "routing":
        guess = d if rng.random() < ROUTER_ACC else DOWN[d]
        i, o, _ = rates("haiku", 3_000)
        acc.cost += (3_000*i + 200*o) / 1e6                     # sınıflandırma çağrısı, küçük context
        start = LADDER.index(ROUTE[guess]) if ROUTE[guess] in LADDER else 2
        ladder = [ROUTE[guess]] + [x for x in LADDER[start+1:]]
        for m, e in ladder:
            ok = attempt(sess, "sub", m, e, d, prof, rng)
            review = guess == "H"
            if review:                                          # zor işte diff'i sonnet de okur
                ri, ro, _ = rates("sonnet", REVIEW_TOK[0])
                acc.cost += (REVIEW_TOK[0]*ri + REVIEW_TOK[1]*ro) / 1e6
            if ok: acc.ok += 1; return
            if not caught(control, rng, review): acc.shipped_bug += 1; return
        acc.gave_up += 1; return

def simulate(prof, strat, n_sessions=400, seed=7):
    rng = random.Random(seed); acc = Acc(); tasks = 0
    for _ in range(n_sessions):
        sess = Session(acc)
        for _ in range(prof.tasks_per_session):
            d = rng.choices(list(prof.mix), weights=list(prof.mix.values()))[0]
            run_task(strat, sess, d, prof, rng); tasks += 1
    return dict(cost_per_task=acc.cost/tasks, correct=acc.ok/tasks, shipped_bug=acc.shipped_bug/tasks,
                gave_up=acc.gave_up/tasks, attempts=acc.attempts/tasks)

if __name__ == "__main__":
    for prof in PROFILES:
        print(f"\n== {prof.name}  ({prof.note})")
        base = simulate(prof, "hepsi fable")["cost_per_task"]
        for s in STRATS:
            r = simulate(prof, s)
            print(f"  {s:16s} görev başı ${r['cost_per_task']:.3f}  ×{base/r['cost_per_task']:5.1f} ucuz"
                  f"  doğru %{r['correct']*100:4.0f}  sessiz hata %{r['shipped_bug']*100:4.0f}"
                  f"  vazgeçti %{r['gave_up']*100:3.0f}  deneme {r['attempts']:.2f}")
