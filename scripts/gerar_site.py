# -*- coding: utf-8 -*-
"""Gera site/data/conselheiros.js (dados do módulo 'Conselheiros e viagens'). Uso: python gerar_site.py [--offline]"""
import sys, os, json
from modelo import construir, RAIZ

M = construir(baixar="--offline" not in sys.argv)
iso = lambda d: d.isoformat() if d else None
L = [dict(d=iso(x["ref"]), m=x["mes"], nm=x["nome"], tp=x["tipo"], en=x["entidade"], fu=x["funcao"], g=x["grupo"], c=x["categoria"],
          v=x["valor"], q=x["qtd"], km=x["km"] or 0, co=x["colegiado"], te=x["tipo_evento"], **{"or": x["origem"]}, uo=x["uf_origem"],
          de=x["destino"], ud=x["uf_destino"], ev=x["evento"], f=x["fonte"], pg=x["programado"], t=x["trip"], ot=x["origem_tipo"]) for x in M["ledger"]]
T = [dict(k=t["trip"], nm=t["nome"], d=iso(t["ref"]), i=iso(t["ini"]), **{"or": t["origem"]}, uo=t["uf_origem"], de=t["destino"], ud=t["uf_destino"],
          di=t["dist"], co=t["colegiado"], te=t["tipo_evento"], ev=t["evento"], total=t["total"]) for t in M["trips"]]
dados = json.dumps(dict(l=L, t=T, gerado=M["gerado_em"]), ensure_ascii=False, separators=(",", ":")).replace("</", "<\/")
pasta = os.path.join(RAIZ, "site", "data")
os.makedirs(pasta, exist_ok=True)
dest = os.path.join(pasta, "conselheiros.js")
open(dest, "w", encoding="utf-8").write('window.PORTAL_DATA = window.PORTAL_DATA || {};\nPORTAL_DATA["conselheiros"] = ' + dados + ";\n")
print("OK", dest, round(os.path.getsize(dest) / 1e6, 2), "MB")
