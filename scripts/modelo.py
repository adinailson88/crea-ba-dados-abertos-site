# -*- coding: utf-8 -*-
"""
Coleta (API Portal da Transparência CREA-BA) e modelagem dos custos de conselheiros.

Uso:  from modelo import construir;  M = construir(baixar=True)
Fonte: https://crea-ba.implanta.net.br/transparencia/api  (Swagger em /api/swagger/docs/v1)
"""
import json, re, math, os, difflib, unicodedata, urllib.request
from collections import defaultdict, Counter
from datetime import date, datetime

BASE = "https://crea-ba.implanta.net.br/transparencia/api/v1.0/"
RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DADOS = os.path.join(RAIZ, "dados")
PERIODO = ("01/2000", "12/2026")   # a API só tem dados desde 04/2025; intervalo largo garante tudo
ENDPOINTS = ["DiariasDeslocamentos", "DespesasViagens", "PassagensAereas", "PassagensTerrestres"]
TIPOS_OK = {"CONSELHEIROS": "Conselheiro", "CONSELHEIRO": "Conselheiro", "PRESIDENTE": "Presidente"}


# ----------------------------------------------------------------- utilidades
def nrm(s):
    s = unicodedata.normalize("NFKD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", s).strip().upper()


def baixar(nome, params=None):
    url = BASE + nome
    if params:
        url += "?" + "&".join(f"{k}={v}" for k, v in params.items())
    req = urllib.request.Request(url, headers={"User-Agent": "pesquisa-transparencia/1.0"})
    with urllib.request.urlopen(req, timeout=300) as r:
        raw = r.read()
    with open(os.path.join(DADOS, nome + ".json"), "wb") as f:
        f.write(raw)
    return json.loads(raw.decode("utf-8"))


def carregar(nome, baixar_agora):
    if baixar_agora:
        p = {} if nome == "Conselheiros" else {"referenciaInicio": PERIODO[0], "referenciaTermino": PERIODO[1]}
        return baixar(nome, p)
    with open(os.path.join(DADOS, nome + ".json"), encoding="utf-8") as f:
        return json.load(f)


def d_iso(s):
    if not s or s.startswith("0001"):
        return None
    return datetime.strptime(s[:10], "%Y-%m-%d").date()


def d_br(s):
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", s or "")
    return date(int(m.group(3)), int(m.group(2)), int(m.group(1))) if m else None


def limpar(s):
    return re.sub(r"\s+", " ", (s or "").replace("\r", " ").replace("\n", " ")).strip()


def haversine(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371.0 * math.asin(math.sqrt(h))


# ----------------------------------------------------------------- geografia (coordenadas aproximadas)
_G = """Salvador|BA|-12.97|-38.51;Barreiras|BA|-12.15|-44.99;Boa Vista do Tupim|BA|-12.65|-40.61;Brumado|BA|-14.20|-41.67;
Camaçari|BA|-12.70|-38.32;Candeias|BA|-12.67|-38.55;Cruz das Almas|BA|-12.67|-39.10;Dias d'Ávila|BA|-12.61|-38.30;
Eunápolis|BA|-16.37|-39.58;Feira de Santana|BA|-12.27|-38.97;Guanambi|BA|-14.22|-42.78;Ilhéus|BA|-14.79|-39.05;
Iraquara|BA|-12.25|-41.62;Itabuna|BA|-14.79|-39.28;Itapetinga|BA|-15.25|-40.25;Jacobina|BA|-11.18|-40.52;
Juazeiro|BA|-9.41|-40.50;Lapão|BA|-11.38|-41.83;Lauro de Freitas|BA|-12.90|-38.32;Luís Eduardo Magalhães|BA|-12.09|-45.80;
Petrolina|PE|-9.39|-40.50;Porto Seguro|BA|-16.44|-39.06;Uruçuca|BA|-14.59|-39.28;Vitória da Conquista|BA|-14.87|-40.84;
Barra|BA|-11.09|-43.14;Aracaju|SE|-10.91|-37.07;Alagoinhas|BA|-12.13|-38.42;Andaraí|BA|-12.80|-41.33;
Balneário Camboriú|SC|-26.99|-48.63;Belo Horizonte|MG|-19.92|-43.94;Belém|PA|-1.46|-48.50;Bom Jesus da Lapa|BA|-13.25|-43.41;
Bonito|MS|-21.13|-56.48;Brasília|DF|-15.79|-47.88;Caetité|BA|-14.07|-42.48;Campinas|SP|-22.91|-47.06;Caxambu|MG|-21.98|-44.93;
Cuiabá|MT|-15.60|-56.10;Curitiba|PR|-25.43|-49.27;Euclides da Cunha|BA|-10.51|-39.02;Florianópolis|SC|-27.60|-48.55;
Fortaleza|CE|-3.73|-38.53;Foz do Iguaçu|PR|-25.55|-54.58;Irecê|BA|-11.30|-41.85;João Pessoa|PB|-7.12|-34.86;
Maceió|AL|-9.67|-35.74;Manaus|AM|-3.12|-60.02;Natal|RN|-5.79|-35.21;Ouro Preto|MG|-20.39|-43.50;Paulo Afonso|BA|-9.40|-38.22;
Recife|PE|-8.05|-34.88;Rio Real|BA|-11.48|-37.93;Rio de Janeiro|RJ|-22.91|-43.17;Santo Antônio de Jesus|BA|-12.97|-39.26;
Santos|SP|-23.96|-46.33;São Luís|MA|-2.53|-44.30;São Paulo|SP|-23.55|-46.63;Teixeira de Freitas|BA|-17.54|-39.74;
Teresina|PI|-5.09|-42.80;Valença|BA|-13.37|-39.07;Jequié|BA|-13.85|-40.08;Poções|BA|-14.52|-40.37;
Ribeira do Pombal|BA|-10.84|-38.54;Seabra|BA|-12.42|-41.77;Santa Maria da Vitória|BA|-13.39|-44.20;
Santa Cruz da Vitória|BA|-14.97|-39.81;Xique-Xique|BA|-10.82|-42.73;Tucano|BA|-10.96|-38.79;Vitória|ES|-20.32|-40.34;
Goiânia|GO|-16.68|-49.25;Campo Grande|MS|-20.47|-54.62;Boa Vista|RR|-2.82|-60.67;Campina Grande|PB|-7.23|-35.88;
Juazeiro do Norte|CE|-7.21|-39.32;Marabá|PA|-5.37|-49.12;Palmas|TO|-10.18|-48.33;Porto Alegre|RS|-30.03|-51.22;
Ribeirão Preto|SP|-21.18|-47.81;Rio Branco|AC|-9.97|-67.81;Santa Maria|RS|-29.69|-53.81;Governador Valadares|MG|-18.85|-41.95;
Navegantes|SC|-26.90|-48.65"""
GEO = {}
for _it in re.split(r";\s*", _G.replace("\n", "")):
    n, uf, la, lo = _it.split("|")
    GEO[nrm(n)] = (n, uf, float(la), float(lo))

IATA = {"AJU": "Aracaju", "BEL": "Belém", "BPS": "Porto Seguro", "BRA": "Barreiras", "BSB": "Brasília", "BVB": "Boa Vista",
        "CGB": "Cuiabá", "CGH": "São Paulo", "CGR": "Campo Grande", "CNF": "Belo Horizonte", "CPV": "Campina Grande",
        "CWB": "Curitiba", "FLN": "Florianópolis", "FOR": "Fortaleza", "GIG": "Rio de Janeiro", "GNM": "Guanambi",
        "GRU": "São Paulo", "GVR": "Governador Valadares", "GYN": "Goiânia", "IGU": "Foz do Iguaçu", "IOS": "Ilhéus",
        "JDO": "Juazeiro do Norte", "JPA": "João Pessoa", "MAB": "Marabá", "MAO": "Manaus", "MCZ": "Maceió", "NAT": "Natal",
        "NVT": "Navegantes", "PMW": "Palmas", "PNZ": "Petrolina", "POA": "Porto Alegre", "RAO": "Ribeirão Preto",
        "RBR": "Rio Branco", "REC": "Recife", "RIA": "Santa Maria", "SDU": "Rio de Janeiro", "SLZ": "São Luís",
        "SSA": "Salvador", "THE": "Teresina", "TXF": "Teixeira de Freitas", "VCP": "Campinas", "VDC": "Vitória da Conquista",
        "VIX": "Vitória"}
FALTANTES = Counter()


def geo(nome):
    """-> (nome canônico, UF, lat, lon) ou (nome, '?', None, None)"""
    k = nrm(nome)
    if k in GEO:
        return GEO[k]
    FALTANTES[nome] += 1
    return (nome.title() if nome.isupper() else nome, "?", None, None)


# ----------------------------------------------------------------- classificação de eventos
CAMARAS = [  # (rótulo, regex sobre texto sem acento, minúsculo)
    ("CEEC – Eng. Civil", r"engenharia civil|\bceec\b|\bcenatec\b|engenheiros civis"),
    ("CEEE – Eng. Elétrica", r"eletric|\bceee\b|sepope"),
    ("CEEMM – Eng. Mecânica e Metalúrgica", r"mecanica|\bceemm\b|metalurgic"),
    ("CEAGRO – Agronomia", r"agronomia|\bc?ceagro|\bc?ceagri|\bcceeagri|agronomo"),
    ("CEGEM – Geologia e Minas", r"geologia|\bc?cegem\b|engenharia de minas|mineracao|exploracao mineral"),
    ("CEEAG – Agrimensura", r"agrimensura|cartograf"),
    ("CEEQ – Eng. Química", r"engenharia quimica|engenharias de quimica|\bc?ceeq\b"),
    ("CEEST – Seg. do Trabalho", r"seguranca do trabalho|\bceest\b|\bcceest\b"),
]
COMISSOES = [
    ("Comissão de Ética (CEP)", r"comissao de etica|\bcep\b|coordenadoria nacional de etica|comissoes de etica"),
    ("COTC – Orçamento e Tomada de Contas", r"orcamento e tomada|\bcotc\b"),
    ("Comissão Eleitoral (CER)", r"comissao eleitoral|\bcer\b"),
    ("CEAP – Educação e Atribuição Prof.", r"\bceaps?\b|educacao e atribuicao"),
    ("CRT – Renovação do Terço", r"renovacao do terco|\bcrt\b"),
    ("Comissão Especial / Regimento", r"comissao especial|regimento"),
]
RX_EXT = (r"congresso|congress\b|seminario|simposio|encontro|forum|expo\b|exposicao|exposibram|conferencia|conference|semana de|workshop|"
          r"oficina|imersao|fenacam|fish congress|geopantanal|conemi|createch|enest|\bcbb\b|cbs\b|\benec\b|cimeira|colegio de presidentes|"
          r"alinhamento com os presidentes|sessao publica|empreender|raizes de inova|pnqai|ismc|cbecimat|cbe 2026|conecta agro|ieee|\bename\b|"
          r"\bconest\b|ifc brasil|\bbim\b|construnordeste|droneshow|agropecuaria|crea aqui|caminhada|movimento rosa|summit|cba de agro|seed congress")
RX_NAC = (r"confea|coordenadoria|\bccee|\bccegem|\bcceest|\bcceagr|colegio de entidades|colegio de presidentes|cdersp|cder/|"
          r"crea summit|encontro de lideres|presidentes dos creas|forum dos creas|forum de presidentes|forum nordeste|entidades de classe|ceaps? regionais")
RX_PROG = r"creajr|crea jr|nucleo|programa mulher|jovem engenheiro|selecao de projetos|programa "
RX_REPR = r"conselho estadual|coede|conselho municipal|audiencia publica|proferir palestra|palestra|representar o presidente|acompanhar o 1|acompanhar o vice|representar o crea"
RX_INST = r"\bpres\.|presidencia|institucion|reunioes internas|participar presencialmente dos eventos|presencial em eventos|sede|inspetoria|visita|solicitacao de diarias|complementacao de diarias"
COLEG_TIPO = {
    "Presidência / Institucional": "Presidência / Institucional",
    "Programas institucionais": "Programas institucionais (CREA Jr, Mulher, Jovem Eng.)",
    "Representação externa": "Representação externa (conselhos, audiências, palestras)",
    "Congresso / Evento externo": "Eventos externos (congressos, seminários)",
    "Sistema Confea/Crea (reuniões nacionais)": "Sistema Confea/Crea (reuniões nacionais)",
    "Treinamento": "Treinamentos de conselheiros",
    "Diretoria": "Diretoria",
}


def classificar_evento(texto):
    t = nrm(texto).lower()
    plen = bool(re.search(r"plenaria|plenario", t))
    cams = []
    for rot, rx in CAMARAS:
        m = re.search(rx, t)
        if m:
            cams.append((m.start(), rot))
    cams.sort()
    cam_list = []
    for _, r in cams:
        if r not in cam_list:
            cam_list.append(r)
    com = next((r for r, rx in COMISSOES if re.search(rx, t)), "")
    dirt = bool(re.search(r"diretoria", t))
    itin = "Sim" if re.search(r"itinerante", t) else "Não"
    trein = bool(re.search(r"treinamento|treinamnto|capacitacao", t))
    ext = bool(re.search(RX_EXT, t))
    nac = bool(re.search(RX_NAC, t))
    prog = bool(re.search(RX_PROG, t))
    repr_ = bool(re.search(RX_REPR, t))
    inst = bool(re.search(RX_INST, t))
    if not cam_list and re.search(r"\bcamara", t) and not (trein or nac):
        cam_list.append("Câmara (não especificada)")
    if trein:
        tipo = "Treinamento"
    elif plen and cam_list:
        tipo = "Plenária + Câmara"
    elif plen:
        tipo = "Plenária"
    elif com and not ext:
        tipo = "Comissão"
    elif dirt and not ext:
        tipo = "Diretoria"
    elif nac:
        tipo = "Sistema Confea/Crea (reuniões nacionais)"
    elif prog:
        tipo = "Programas institucionais"
    elif repr_:
        tipo = "Representação externa"
    elif ext:
        tipo = "Congresso / Evento externo"
    elif cam_list:
        tipo = "Câmara Especializada"
    elif com:
        tipo = "Comissão"
    elif inst:
        tipo = "Presidência / Institucional"
    else:
        tipo = "Outros"
    camara = cam_list[0] if cam_list else ""
    if plen and not trein:
        colegiado = "Plenário"
    elif camara:
        colegiado = camara
    elif com:
        colegiado = com
    elif dirt:
        colegiado = "Diretoria"
    else:
        colegiado = COLEG_TIPO.get(tipo, "Sem colegiado (evento/institucional)")
    return dict(tipo_evento=tipo, colegiado=colegiado, camara=camara, camaras_todas=" | ".join(cam_list),
                comissao=com, itinerante=itin)


CATEGORIAS = [
    ("Jeton", r"jeton"), ("Diárias fora do Estado", r"diarias fora|interestadual"), ("Diárias no Estado", r"diarias dentro|complemento de diaria"),
    ("Auxílio Terrestre (km)", r"at - km|terrestre.*km"), ("Auxílio Terrestre (RMS)", r"at - rms|terrestre.*rms"),
    ("Auxílio Deslocamento (AD)", r"deslocamento"), ("Auxílio Alimentação", r"alimentacao"),
    ("Reembolso de Inscrição", r"inscri"), ("Reembolso de Passagem", r"passagem"),
]


def grupo(c):
    if c == "Jeton":
        return "Jeton"
    if c.startswith("Diárias") or c.startswith("Complemento"):
        return "Diárias"
    if c.startswith("Auxílio"):
        return "Auxílios"
    if "assagem" in c:
        return "Passagens"
    return "Outros"


def categoria(nome):
    t = nrm(nome).lower()
    for r, rx in CATEGORIAS:
        if re.search(rx, t):
            return r
    return nome.strip()


# ----------------------------------------------------------------- parse de campos
RX_PASS = re.compile(r"^(?P<nome>.+?)\s+-\s+(?P<tipo>[A-ZÇÃÕÁÉÍÓÚÊ/ ]+?)\s*-\s*CPF:\s*(?P<cpf>[\dX.\-]+)", re.I)
RX_CPF = re.compile(r"\d{3}\.X+\.X+-\d{2}")


def parse_evento_diaria(txt):
    """'Início: 4/24/2025 - 8:00 AM Término: ... | Título'\r\n... -> (inicio, fim, [títulos])"""
    ini, fim, tits = [], [], []
    for parte in re.split(r"\r?\n", txt or ""):
        parte = parte.strip()
        if not parte:
            continue
        m = re.search(r"Início:\s*(\d+)/(\d+)/(\d{4}).*?Término:\s*(\d+)/(\d+)/(\d{4})", parte)
        if m:
            ini.append(date(int(m.group(3)), int(m.group(1)), int(m.group(2))))
            fim.append(date(int(m.group(6)), int(m.group(4)), int(m.group(5))))
        t = parte.split("|", 1)[-1] if "|" in parte else parte
        t = limpar(t)
        if t and t not in tits:
            tits.append(t)
    return (min(ini) if ini else None, max(fim) if fim else None, tits)


def trimestre(d):
    return f"{d.year}-T{(d.month - 1) // 3 + 1}"


def sem_titulo(nome):
    """'Eng. de Minas PEDRO AUGUSTO' -> 'PEDRO AUGUSTO' (tira o título profissional até 1ª palavra toda em maiúsculas)."""
    toks = nome.split()
    for i, t in enumerate(toks):
        letras = re.sub(r"[^A-Za-zÀ-ÿ]", "", t)
        if len(letras) >= 2 and letras.isupper() and t not in ("DA", "DE", "DO", "DAS", "DOS", "II", "III"):
            return " ".join(toks[i:])
    return nome


# ----------------------------------------------------------------- construção do modelo
def construir(baixar=True):
    os.makedirs(DADOS, exist_ok=True)
    rol_raw = carregar("Conselheiros", baixar)[0]["CONSELHEIROS"]
    diar = carregar("DiariasDeslocamentos", baixar)
    desp = carregar("DespesasViagens", baixar)
    aer = carregar("PassagensAereas", baixar)
    ter = carregar("PassagensTerrestres", baixar)
    log = []

    # --- rol de mandatários -------------------------------------------------
    rol = []
    for r in rol_raw:
        cargo = r["CARGO"].strip()
        m = re.match(r"(CONSELHEIR[OA]\s+(?:TITULAR|SUPLENTE))\s*-\s*(.*?)(?:\s*-\s*MANDATO\s*([\d/]+))?\s*$", cargo, re.I)
        funcao, entidade, mand = (m.group(1).title(), m.group(2).strip(), m.group(3) or "") if m else (cargo, "", "")
        mm = re.search(r"-\s*(20\d\d/20\d\d)\s*$", entidade)
        if mm and not mand:
            mand = mm.group(1)
        entidade = re.sub(r"\s*-\s*20\d\d/20\d\d\s*$", "", entidade).strip()
        nome = sem_titulo(r["NOME_MANDATARIO"].strip())
        rol.append(dict(nome=nome.title().replace(" Da ", " da ").replace(" De ", " de ").replace(" Do ", " do ")
                        .replace(" Dos ", " dos ").replace(" Das ", " das "),
                        titulo=r["NOME_MANDATARIO"].strip()[:len(r["NOME_MANDATARIO"].strip()) - len(nome)].strip(),
                        nome_n=nrm(nome), cpf=r["CPF"], email=r["EMAIL_MANDATARIO"], funcao=funcao.replace("Conselheira", "Conselheiro"),
                        entidade=entidade, mandato=mand, posse=r["DATA_POSSE"], fim_mandato=r["DATA_PREVISTA_FIM_MANDATO"],
                        exoneracao=r["DATA_EFETIVA_EXONERACAO"], cargo_original=cargo))
    rol_cpf = defaultdict(list)
    rol_nome = {}
    for x in rol:
        rol_cpf[x["cpf"]].append(x)
        rol_nome[x["nome_n"]] = x

    # --- diárias (livro-razão base) ----------------------------------------
    presta = {}
    for r in desp:
        cpf = (RX_CPF.search(r["NOME_FAVORECIDO"]) or [None])[0]
        k = (r["NUMERO_PROCESSO"].strip(), cpf, categoria(r["NOME_DESPESA_PADRAO"]), round(r["VALOR_TOTAL"] or 0, 2))
        presta[k] = (d_iso(r["DATA_PRESTACAO_CONTA"]), r["NOME_DESPESA"].strip())

    pessoas = {}      # nome_n -> dict(nome, cpf, tipo)
    ledger = []

    def pessoa(nome, cpf, tipo):
        k = nrm(nome)
        p = pessoas.get(k)
        if not p:
            pessoas[k] = p = dict(nome=limpar(nome).title().replace(" Da ", " da ").replace(" De ", " de ").replace(" Do ", " do ")
                                  .replace(" Dos ", " dos ").replace(" Das ", " das ").replace(" E ", " e "), cpf=cpf, tipo=tipo, k=k)
        if cpf and not p["cpf"]:
            p["cpf"] = cpf
        if tipo == "Presidente":
            p["tipo"] = "Presidente"
        return p

    ignorados = Counter()
    for r in diar:
        m = RX_PASS.match(r["NOME_PASSAGEIRO"].strip())
        if not m:
            ignorados["sem_parse"] += 1
            continue
        tp = TIPOS_OK.get(m.group("tipo").strip().upper())
        if not tp:
            ignorados[m.group("tipo").strip()] += 1
            continue
        p = pessoa(m.group("nome"), m.group("cpf"), tp)
        ini, fim, tits = parse_evento_diaria(r["NOME_EVENTO"])
        if not tits and r.get("EVENTOS_CONCATENADOS"):
            tits = [limpar(r["EVENTOS_CONCATENADOS"])]
        evento = " || ".join(tits)
        cl = classificar_evento(evento)
        mo = re.search(r"CIDADE ORIGEM:\s*(.+?)-([A-Z]{2})\s*$", r["ORIGEM_PASSAGEIRO"].strip(), re.I)
        orig = geo(limpar(mo.group(1)).title() if mo else "")
        orig_uf = mo.group(2).upper() if mo else orig[1]
        dests = []
        for c in re.split(r"[\r\n]+", r["CIDADE"] or ""):
            c = c.strip()
            if c and c not in dests:
                dests.append(c)
        dgeo = [geo(c) for c in dests]
        dpriv = dgeo[0] if dgeo else ("", "?", None, None)
        # destino "principal" = o mais distante da origem
        if len(dgeo) > 1 and orig[2] is not None:
            cand = [g for g in dgeo if g[2] is not None]
            if cand:
                dpriv = max(cand, key=lambda g: haversine((orig[2], orig[3]), (g[2], g[3])))
        dist = round(haversine((orig[2], orig[3]), (dpriv[2], dpriv[3])), 1) if orig[2] is not None and dpriv[2] is not None else None
        dpg = d_iso(r["DATA_PAGAMENTO"])
        cat = categoria(r["NOME_DESPESA_PADRAO"])
        processo = r["CODIGO_PROCESSO"].strip()
        pc = presta.get((processo, p["cpf"], cat, round(r["VALOR_TOTAL"] or 0, 2)))
        nivel = (re.search(r"N[ií]vel\s+(I+)", r["NOME_DESPESA_PADRAO"]) or [None, ""])[1]
        pd_ = re.search(r"(\d{2}/\d{2}/\d{4})\s*a\s*(\d{2}/\d{2}/\d{4})", r["PERIODO_DESLOCAMENTO_FORMATADO"] or "")
        di, df = (d_br(pd_.group(1)), d_br(pd_.group(2))) if pd_ else (None, None)
        ledger.append(dict(
            fonte="Diárias/Despesas", pk=p["k"], processo=processo, ref=dpg or ini, data_pagamento=dpg,
            prestacao=pc[0] if pc else None, despesa=r["NOME_DESPESA_PADRAO"].strip(), categoria=cat, nivel=nivel,
            qtd=r["QUANTIDADE"], unit=r["VALOR_UNITARIO"], valor=round(r["VALOR_TOTAL"] or 0, 2),
            km=(r["QUANTIDADE"] if cat == "Auxílio Terrestre (km)" else 0),
            ini=di or ini, fim=df or fim, dias=((df - di).days + 1) if di and df else None,
            evento=evento, origem=orig[0], uf_origem=orig_uf, origem_xy=(orig[2], orig[3]),
            destino=dpriv[0], destinos=" | ".join(dests), uf_destino=dpriv[1], destino_xy=(dpriv[2], dpriv[3]), dist=dist,
            cia="", doc="", trecho="", **cl))

    # --- passagens (tarifa do bilhete é custo à parte) --------------------------
    def achar_pessoa(nome, tipo):
        k = nrm(nome)
        if k in pessoas:
            return pessoas[k]
        cand = difflib.get_close_matches(k, list(pessoas), n=1, cutoff=0.88)
        if cand:
            log.append(f"Nome de passagem '{nome}' associado a '{pessoas[cand[0]]['nome']}' (similaridade)")
            return pessoas[cand[0]]
        return pessoa(nome, None, tipo)

    # índice de viagens (diárias) para associar bilhetes
    viag_idx = defaultdict(list)
    for L in ledger:
        viag_idx[(L["pk"], L["processo"])].append(L)

    def heranca(pk, processo, dref, evento_txt):
        c = viag_idx.get((pk, processo))
        if not c:
            return None
        if dref:
            c = sorted(c, key=lambda L: abs(((L["data_pagamento"] or L["ini"] or dref) - dref).days))
        return c[0]

    def trecho_aereo(fmt):
        cods = [c for c in fmt.split("/") if c]
        if not cods:
            return "", "", None, None
        o = geo(IATA.get(cods[0], cods[0]))
        cand = [geo(IATA.get(c, c)) for c in cods[1:]]
        cand = [g for g in cand if g[2] is not None and o[2] is not None]
        d = max(cand, key=lambda g: haversine((o[2], o[3]), (g[2], g[3]))) if cand else (cods[-1], "?", None, None)
        return o, d

    vistos = set()
    dup_aer = 0
    for p in aer:
        tp = TIPOS_OK.get(nrm(p["TIPO_PASSAGEIRO"]).strip(), None)
        if not tp:
            continue
        pe = achar_pessoa(p["NOME_PASSAGEIRO"], tp)
        evt = " || ".join(limpar(e["NOME_EVENTO_FORMATADO"]) for e in p["EVENTOS"])
        ev_ini = d_br(evt)
        titulo = re.sub(r"^\s*\d{2}/\d{2}/\d{4}[\d:\s]*a\s*\d{2}/\d{2}/\d{4}[\d:\s]*-\s*", "", limpar(evt))
        for t in p["PASSAGENS_AEREAS"]:
            k = (t["LOCALIZADOR"], pe["k"], round(t["TOTAL_TARIFAS"], 2))
            if k in vistos:
                dup_aer += 1
                continue
            vistos.add(k)
            dep = d_br(t["DATA_IDA_E_VOLTA_FORMATADA"]) or ev_ini
            o, d = trecho_aereo(t["ORIGEM_DESTINO_FORMATADO"])
            h = heranca(pe["k"], p["CODIGO_PROCESSO"].strip(), dep, evt)
            cl = classificar_evento(titulo)
            if h:
                cl = {kk: h[kk] for kk in cl}
            dist = round(haversine((o[2], o[3]), (d[2], d[3])), 1) if o and o[2] is not None and d[2] is not None else None
            ledger.append(dict(
                fonte="Passagem aérea", pk=pe["k"], processo=p["CODIGO_PROCESSO"].strip(), ref=dep, data_pagamento=None, prestacao=None,
                despesa="Passagem aérea", categoria="Passagem aérea", nivel="", qtd=1, unit=t["TOTAL_TARIFAS"], valor=round(t["TOTAL_TARIFAS"], 2),
                km=0, ini=dep, fim=None, dias=None, evento=titulo, origem=o[0], uf_origem=o[1], origem_xy=(o[2], o[3]),
                destino=d[0], destinos=d[0], uf_destino=d[1], destino_xy=(d[2], d[3]), dist=dist,
                cia=t["CIA_AEREA"].strip(), doc=t["LOCALIZADOR"], trecho=t["ORIGEM_DESTINO_FORMATADO"], _h=h, **cl))
    log.append(f"Passagens aéreas duplicadas ignoradas: {dup_aer}")

    dup_ter = 0
    reemb = {(L["pk"], round(L["valor"], 2)) for L in ledger if L["categoria"] == "Reembolso de Passagem"}
    for p in ter:
        tp = TIPOS_OK.get(nrm(p["TIPO_PASSAGEIRO"]).strip(), None)
        if not tp:
            continue
        nome = p["NOME_PASSAGEIRO"].split("/")[0].strip()
        pe = achar_pessoa(nome, tp)
        k = (p["NUMERO_BILHETE"], pe["k"], round(p["TOTAL_TARIFAS"], 2))
        if k in vistos:
            dup_ter += 1
            continue
        vistos.add(k)
        evt = limpar(p["NOME_EVENTO_FORMATADO"])
        titulo = re.sub(r"^\s*\d{2}/\d{2}/\d{4}[\d:\s]*a\s*\d{2}/\d{2}/\d{4}[\d:\s]*-\s*", "", evt)
        dep = d_br(p["DATA_IDA_E_VOLTA_FORMATADA"]) or d_br(evt)
        partes = [x.strip() for x in p["ORIGEM_DESTINO_FORMATADO"].split("/") if x.strip()]
        o = geo(partes[0]) if partes else ("", "?", None, None)
        d = geo(partes[1]) if len(partes) > 1 else o
        proc = re.sub(r"\D", "", p["CODIGO_PROCESSO"])
        h = heranca(pe["k"], proc, dep, evt)
        cl = classificar_evento(titulo)
        if h:
            cl = {kk: h[kk] for kk in cl}
        dist = round(haversine((o[2], o[3]), (d[2], d[3])), 1) if o[2] is not None and d[2] is not None else None
        dup_reemb = (pe["k"], round(p["TOTAL_TARIFAS"], 2)) in reemb
        if dup_reemb:
            log.append(f"ATENÇÃO: bilhete terrestre {p['NUMERO_BILHETE']} ({pe['nome']}, R$ {p['TOTAL_TARIFAS']}) tem mesmo valor de 'Reembolso de Passagem' — mantido nos dois; verificar.")
        ledger.append(dict(
            fonte="Passagem terrestre", pk=pe["k"], processo=proc, ref=dep, data_pagamento=None, prestacao=None,
            despesa="Passagem terrestre", categoria="Passagem terrestre", nivel="", qtd=1, unit=p["TOTAL_TARIFAS"], valor=round(p["TOTAL_TARIFAS"], 2),
            km=0, ini=dep, fim=None, dias=None, evento=titulo, origem=o[0], uf_origem=o[1], origem_xy=(o[2], o[3]),
            destino=d[0], destinos=d[0], uf_destino=d[1], destino_xy=(d[2], d[3]), dist=dist,
            cia=p["CIA_TERRESTRE"].strip(), doc=p["NUMERO_BILHETE"], trecho=p["ORIGEM_DESTINO_FORMATADO"], _h=h, **cl))
    log.append(f"Passagens terrestres duplicadas ignoradas: {dup_ter}")

    # --- vínculo com rol (entidade/função) ---------------------------------------
    for p in pessoas.values():
        x = None
        if p["cpf"] and p["cpf"] in rol_cpf:
            cands = rol_cpf[p["cpf"]]
            x = min(cands, key=lambda c: -difflib.SequenceMatcher(None, c["nome_n"], p["k"]).ratio())
            if difflib.SequenceMatcher(None, x["nome_n"], p["k"]).ratio() < 0.6:
                x = None
        if x is None and p["k"] in rol_nome:
            x = rol_nome[p["k"]]
        if x is None:
            c = difflib.get_close_matches(p["k"], list(rol_nome), n=1, cutoff=0.9)
            x = rol_nome[c[0]] if c else None
        p["rol"] = x

    # bilhete vinculado a uma viagem herda evento/datas/origem/destino dela (o trecho do bilhete fica em 'trecho')
    for L in ledger:
        h = L.pop("_h", None)
        if h:
            for k in ("evento", "ini", "fim", "dias", "origem", "uf_origem", "origem_xy", "destino", "destinos", "uf_destino", "destino_xy", "dist"):
                L[k] = h[k]
            L["vinculado"] = "Sim"
        else:
            L["vinculado"] = "Sim" if L["fonte"] == "Diárias/Despesas" else "Não"

    # --- origem dos conselheiros SEM diárias: inferida pelos voos; na dúvida, fica "não informada" ----------
    AEROP_BA = {"BRA": "Barreiras", "VDC": "Vitória da Conquista", "BPS": "Porto Seguro", "IOS": "Ilhéus", "GNM": "Guanambi", "TXF": "Teixeira de Freitas"}
    # confirmações do usuário (None = dúvida -> não informar)
    OVERRIDE = {nrm("Ciro Campos Chaves"): "Vitória da Conquista", nrm("Charles Henrique Wallauer"): "Barreiras",
                nrm("Izabel Cristina Ceron de Paula"): "Barreiras", nrm("Renata Silva Brandão"): "Barreiras",
                nrm("Eder Ramos"): "Salvador", nrm("Elizeu Marcos Silva"): "Salvador", nrm("Jonatas Fernandes Araújo Sodré"): "Salvador",
                nrm("Rute Carvalhal Borges"): None, nrm("Genilson Cunha de Oliveira Filho"): None}
    por_pessoa = defaultdict(list)
    for L in ledger:
        por_pessoa[L["pk"]].append(L)
    for pk, rows_ in por_pessoa.items():
        dec_rows = [L for L in rows_ if L["fonte"] == "Diárias/Despesas"]
        if dec_rows:
            hk = Counter((L["origem"], L["uf_origem"]) for L in dec_rows).most_common(1)[0][0]
            g = geo(hk[0])
            for L in rows_:
                if L["fonte"] == "Passagem aérea" and L["vinculado"] != "Sim" and g[2] is not None:
                    cs = [c for c in L["trecho"].split("/") if c]
                    cand = [geo(IATA.get(c, c)) for c in cs]
                    cand = [x for x in cand if x[0] != g[0] and x[2] is not None]
                    L.update(origem=g[0], uf_origem=hk[1], origem_xy=(g[2], g[3]))
                    if cand:
                        d = max(cand, key=lambda x: haversine((g[2], g[3]), (x[2], x[3])))
                        L.update(destino=d[0], destinos=d[0], uf_destino=d[1], destino_xy=(d[2], d[3]),
                                 dist=round(haversine((g[2], g[3]), (d[2], d[3])), 1))
                    else:
                        L.update(dist=0.0)
                    L["origem_tipo"] = "Declarada (diárias)"
                else:
                    L["origem_tipo"] = "Declarada (diárias)" if L["fonte"] == "Diárias/Despesas" or L["vinculado"] == "Sim" else "Trecho do bilhete"
            continue
        aer = [L for L in rows_ if L["fonte"] == "Passagem aérea"]
        codes = [[c for c in L["trecho"].split("/") if c] for L in aer]
        if pk in OVERRIDE:
            home = OVERRIDE[pk]
        elif len(aer) == len(rows_) and codes:
            outros = {c for cs in codes for c in cs if c != "SSA"}
            if all("SSA" in cs for cs in codes) and len(outros) == 1 and next(iter(outros)) in AEROP_BA:
                home = AEROP_BA[next(iter(outros))]
            elif all("SSA" in cs for cs in codes) and any(cs[0] == "SSA" for cs in codes) and not (outros & set(AEROP_BA)):
                home = "Salvador"
            else:
                home = None
        else:
            home = None
        for L in rows_:
            if home:
                g = geo(home)
                cs = [c for c in L["trecho"].split("/") if c]
                cand = [geo(IATA.get(c, c)) for c in cs if geo(IATA.get(c, c))[0] != g[0] and geo(IATA.get(c, c))[2] is not None]
                d = max(cand, key=lambda x: haversine((g[2], g[3]), (x[2], x[3]))) if cand else None
                L.update(origem=g[0], uf_origem=g[1], origem_xy=(g[2], g[3]), origem_tipo="Inferida (voos)")
                if d:
                    L.update(destino=d[0], destinos=d[0], uf_destino=d[1], destino_xy=(d[2], d[3]),
                             dist=round(haversine((g[2], g[3]), (d[2], d[3])), 1))
            else:
                L.update(origem="(não informada)", uf_origem="?", origem_xy=(None, None), dist=None, origem_tipo="Não informada")

    # --- datas / chaves derivadas, id --------------------------------------------
    ledger = [L for L in ledger if L["ref"]]
    ledger.sort(key=lambda L: (L["ref"], L["pk"], L["processo"], L["categoria"]))
    for i, L in enumerate(ledger, 1):
        p = pessoas[L["pk"]]
        L["id"] = i
        L["grupo"] = grupo(L["categoria"])
        L["programado"] = "Sim" if L["ref"] > date.today() else "Não"
        L["nome"] = p["nome"]
        L["cpf"] = p["cpf"] or ""
        L["tipo"] = p["tipo"]
        L["entidade"] = p["rol"]["entidade"] if p["rol"] else ""
        L["funcao"] = p["rol"]["funcao"] if p["rol"] else ""
        L["ano"] = L["ref"].year
        L["mes"] = f"{L['ref'].year}-{L['ref'].month:02d}"
        L["tri"] = trimestre(L["ref"])
        L["trip"] = f"{L['pk']}|{L['processo']}|{(L['ini'] or L['ref']).year}|{nrm(L['evento'])[:60]}"

    # --- viagens (nível pessoa x processo/evento) ---------------------------------
    trips = {}
    for L in ledger:
        t = trips.setdefault(L["trip"], dict(
            trip=L["trip"], nome=L["nome"], cpf=L["cpf"], tipo=L["tipo"], entidade=L["entidade"], processo=L["processo"], evento=L["evento"],
            tipo_evento=L["tipo_evento"], colegiado=L["colegiado"], camara=L["camara"], comissao=L["comissao"], itinerante=L["itinerante"],
            origem=L["origem"], uf_origem=L["uf_origem"], origem_tipo=L["origem_tipo"], destino=L["destino"], destinos=L["destinos"], uf_destino=L["uf_destino"],
            dist=L["dist"], ini=L["ini"], fim=L["fim"], ref=L["ref"], mes=L["mes"], ano=L["ano"],
            total=0.0, jeton=0.0, diarias=0.0, auxilios=0.0, passagens=0.0, outros=0.0, km=0.0, n=0))
        g = L["grupo"]
        t["total"] += L["valor"]
        t["n"] += 1
        t["km"] += L["km"] or 0
        k2 = {"Jeton": "jeton", "Diárias": "diarias", "Auxílios": "auxilios", "Passagens": "passagens", "Outros": "outros"}[g]
        t[k2] += L["valor"]
        if L["fonte"] == "Diárias/Despesas":   # a viagem herda datas/origem da linha de diárias
            t["ini"] = L["ini"] or t["ini"]
            t["fim"] = L["fim"] or t["fim"]
            t["origem"], t["uf_origem"], t["destino"], t["destinos"], t["uf_destino"], t["dist"] = (
                L["origem"], L["uf_origem"], L["destino"], L["destinos"], L["uf_destino"], L["dist"])
        t["ref"] = min(t["ref"], L["ref"])
    trips = sorted(trips.values(), key=lambda t: (t["ref"], t["nome"]))
    for t in trips:
        t["mes"] = f"{t['ref'].year}-{t['ref'].month:02d}"
        t["ano"] = t["ref"].year
        for k in ("total", "jeton", "diarias", "auxilios", "passagens", "outros", "km"):
            t[k] = round(t[k], 2)

    if FALTANTES:
        log.append("Cidades sem coordenadas/UF no dicionário: " + ", ".join(f"{k} ({v})" for k, v in FALTANTES.items()))
    if ignorados:
        log.append("Linhas de diárias ignoradas por não serem conselheiro/presidente: " + ", ".join(f"{k}={v}" for k, v in ignorados.most_common()))

    return dict(ledger=ledger, trips=trips, pessoas=pessoas, rol=rol, geo=GEO, log=log,
                gerado_em=datetime.now().strftime("%d/%m/%Y %H:%M"))


if __name__ == "__main__":
    M = construir(baixar=False)
    L = M["ledger"]
    print("lançamentos", len(L), "viagens", len(M["trips"]), "pessoas", len(M["pessoas"]))
    print("TOTAL R$", round(sum(x["valor"] for x in L), 2))
    for c, v in Counter({k: 0 for k in []}).items():
        pass
    tot = defaultdict(float)
    for x in L:
        tot[x["fonte"]] += x["valor"]
    print(dict(tot))
    print("\n".join(M["log"]))
