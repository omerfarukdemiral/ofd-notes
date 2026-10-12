import sim
from sim import *

# routing varyantları: hangi kurulum gerçekten kazandırıyor?
VARIANTS = {
  # v1: mevcut. E haiku, M sonnet, H opus + review, subagent ile
  "routing v1": dict(route=dict(E=("haiku","low"), M=("sonnet","med"), H=("opus","high")), how="sub", review=True),
  # v2: zor işte de sonnet'ten başla, test kalırsa opus
  "routing v2": dict(route=dict(E=("haiku","low"), M=("sonnet","med"), H=("sonnet","high")), how="sub", review=True),
  # v3: v2 ama ana oturumda model değiştirerek, subagent yükü yok
  "routing v3": dict(route=dict(E=("haiku","low"), M=("sonnet","med"), H=("sonnet","high")), how="main", review=True),
  # v4: sonnet varsayılan, sadece kolay işler haiku subagent'a, zor işte test kalırsa opus
  "sonnet + kolayı devret": dict(route=dict(E=("haiku","low"), M=("sonnet","high"), H=("sonnet","high")), how="mixed", review=False),
}
LAD = [("haiku","low"),("haiku","max"),("sonnet","med"),("sonnet","high"),("opus","high"),("fable","high")]

def run_var(cfg, sess, d, prof, rng):
    acc = sess.acc
    guess = d if rng.random() < ROUTER_ACC else DOWN[d]
    i, o, _ = rates("haiku", 3_000); acc.cost += (3_000*i + 200*o)/1e6
    first = cfg["route"][guess]; k = LAD.index(first)
    ladder = [first] + [x for x in LAD[k+1:] if x[0] != first[0] or x == first][:0] + [x for x in LAD if LAD.index(x) > k and x[1] in ("high",) ]
    seen=[]; [seen.append(x) for x in ladder if x not in seen]; ladder = seen
    for m, e in ladder:
        how = cfg["how"] if cfg["how"] != "mixed" else ("sub" if m == "haiku" else "main")
        ok = attempt(sess, how, m, e, d, prof, rng)
        review = cfg["review"] and guess == "H"
        if review:
            ri, ro, _ = rates("sonnet", REVIEW_TOK[0]); acc.cost += (REVIEW_TOK[0]*ri + REVIEW_TOK[1]*ro)/1e6
        if ok: acc.ok += 1; return
        if not caught(prof.control, rng, review): acc.shipped_bug += 1; return
    acc.gave_up += 1

def simv(prof, cfg, n=400, seed=7):
    rng = random.Random(seed); acc = Acc(); tasks = 0
    for _ in range(n):
        s = Session(acc)
        for _ in range(prof.tasks_per_session):
            d = rng.choices(list(prof.mix), weights=list(prof.mix.values()))[0]
            run_var(cfg, s, d, prof, rng); tasks += 1
    return acc.cost/tasks, acc.ok/tasks, acc.shipped_bug/tasks

if __name__ == "__main__":
    for prof in PROFILES:
        print("\n==", prof.name)
        for s in ["hepsi opus","hepsi sonnet"]:
            r = simulate(prof, s); print(f"  {s:24s} ${r['cost_per_task']:.3f}  doğru %{r['correct']*100:.0f}  sessiz %{r['shipped_bug']*100:.0f}")
        for name, cfg in VARIANTS.items():
            c, ok, bug = simv(prof, cfg); print(f"  {name:24s} ${c:.3f}  doğru %{ok*100:.0f}  sessiz %{bug*100:.0f}")
