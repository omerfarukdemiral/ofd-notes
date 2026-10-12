import itertools, copy, sim, variants
from sim import PROFILES, simulate
from variants import simv, VARIANTS

BASEP = copy.deepcopy(sim.P); BASETHINK = dict(sim.THINK)
def scale_probs(model, k):
    for d in sim.P:
        for key in sim.P[d]:
            if key[0] == model: sim.P[d][key] = min(0.995, BASEP[d][key]*k)

grid = dict(SYS=[10_000, 20_000, 40_000], TOOL=[1_500, 2_500, 4_000], THINK=[0.5, 1, 2],
            HAIKU=[0.8, 1.0, 1.2], SONNET=[0.9, 1.0, 1.05], ROUTER=[0.65, 0.8, 0.95])
keys = list(grid); combos = list(itertools.product(*grid.values()))
import random; random.Random(1).shuffle(combos); combos = combos[:120]

out = {p.name: dict(route_cheaper_than_sonnet=0, route_more_correct_than_sonnet=0, route_cheaper_than_opus=0,
                    sonnet_cheaper_than_opus=0, haiku_silent_over_10=0, cascade_silent_over_10=0, n=0) for p in PROFILES}
for c in combos:
    cfg = dict(zip(keys, c))
    sim.P = copy.deepcopy(BASEP); variants.P = sim.P
    sim.SYS = cfg["SYS"]; sim.TOOL_RESULT = cfg["TOOL"]; sim.THINK = {k: v*cfg["THINK"] for k, v in BASETHINK.items()}
    scale_probs("haiku", cfg["HAIKU"]); scale_probs("sonnet", cfg["SONNET"]); sim.ROUTER_ACC = cfg["ROUTER"]
    for mod in (variants,): mod.SYS = sim.SYS; mod.TOOL_RESULT = sim.TOOL_RESULT; mod.THINK = sim.THINK; mod.ROUTER_ACC = sim.ROUTER_ACC; mod.P = sim.P
    for p in PROFILES:
        o = out[p.name]; o["n"] += 1
        so = simulate(p, "hepsi sonnet", 150); op = simulate(p, "hepsi opus", 150)
        hk = simulate(p, "hepsi haiku", 150); cs = simulate(p, "haiku + kontrol", 150)
        rc, rok, _ = simv(p, VARIANTS["routing v2"], 150)
        o["route_cheaper_than_sonnet"] += rc < so["cost_per_task"]
        o["route_more_correct_than_sonnet"] += rok > so["correct"] + 0.005
        o["route_cheaper_than_opus"] += rc < op["cost_per_task"]
        o["sonnet_cheaper_than_opus"] += so["cost_per_task"] < op["cost_per_task"]
        o["haiku_silent_over_10"] += hk["shipped_bug"] > 0.10
        o["cascade_silent_over_10"] += cs["shipped_bug"] > 0.10
for name, o in out.items():
    n = o.pop("n"); print(f"\n== {name} ({n} senaryo)")
    for k, v in o.items(): print(f"  {k:32s} %{v/n*100:.0f}")
