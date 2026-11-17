"""Compila as fontes TeX em HTML e MathML. Requer pandoc e lxml."""

import os
from pathlib import Path
import re
import subprocess
import unicodedata
from lxml import etree, html

RAIZ = Path(__file__).resolve().parents[1]
SITE = RAIZ / "site" / "dist"
FONTES = RAIZ / "site" / "textos"
PANDOC = os.environ.get("PANDOC", "pandoc")


def compilar(tex, *opcoes):
    # A vírgula decimal ganha uma marca própria para ser reunida ao número.
    tex = re.sub(r"(\d)\{,\}(\d)", r"\1\\mathrm{,}\2", tex)
    proc = subprocess.run([PANDOC, "-f", "latex", "-t", "html5", "--mathml",
                           "--wrap=none", *opcoes], input=tex, text=True,
                          encoding="utf-8", capture_output=True, check=True)
    if proc.stderr.strip():
        raise ValueError(proc.stderr)
    return html.fragment_fromstring(proc.stdout, create_parent="div")


def preencher(alvo, origem):
    for filho in list(alvo):
        alvo.remove(filho)
    alvo.text = origem.text
    for filho in list(origem):
        alvo.append(filho)


def ler_blocos(arquivo):
    partes = re.split(r"^%%% ([\w-]+)\s*$", arquivo.read_text(encoding="utf-8"), flags=re.M)
    return dict(zip(partes[1::2], partes[2::2]))


def compilar_blocos(doc, arquivo):
    blocos = ler_blocos(arquivo)
    texto = "\n\n".join(r"\section*{bloco-"+k+"}\n"+v for k,v in blocos.items())
    arvore = compilar(texto, "--section-divs")
    for secao in arvore.xpath("./section"):
        nome = secao[0].text.removeprefix("bloco-")
        secao.remove(secao[0])
        alvo, = doc.xpath('//*[@data-tex=$nome]', nome=nome)
        if len(secao) == 1 and secao[0].tag == "p":
            preencher(alvo, secao[0])
        else:
            preencher(alvo, secao)


def corpo_texto():
    tex = (RAIZ/"texto/teoria.tex").read_text(encoding="utf-8")
    corpo = tex.split(r"\maketitle",1)[1].split(r"\end{document}",1)[0]
    # O estilo das colunas da tabela é específico da página impressa.
    corpo = re.sub(r"\\begin\{tabular\}\{>[^\n]+", r"\\begin{tabular}{lll}", corpo)
    corpo = corpo.replace("{l*{10}{c}}", "{lcccccccccc}")
    corpo = corpo.replace("\\par\\qquad ", "\\par RECUOB ").replace("\\par\\quad ", "\\par RECUOA ")
    corpo = corpo.replace(r"\cicloCEM", r"\includegraphics[width=0.92\linewidth,alt={Ciclo do CEM: coletar, ordenar, selecionar e ajustar}]{../media/ciclo.png}")
    return corpo.replace("{algoritmo}", "{quote}")


def teoria(doc):
    corpo = corpo_texto().replace("../media/", "").replace("https://metodo-da-entropia-cruzada.vercel.app/", "")
    secoes = compilar(corpo, "--section-divs", "--shift-heading-level-by=1")
    painel, = doc.xpath('//*[@id="jogo-interativo"]')
    painel.getparent().remove(painel)
    alvo, = doc.xpath("//article")
    preencher(alvo, secoes)
    for secao in alvo.xpath("./section"):
        cabecalho = secao.find("h2")
        if cabecalho is None:
            continue
        secao.set("class","sec")
        titulo = cabecalho.text_content()
        if titulo == "O método":
            paragrafo = next(p for p in secao.iter("p") if "A tabela permite verificar" in p.text_content())
            paragrafo.addprevious(painel)
        if titulo == "Referências":
            secao.set("class","sec referencias")
    for tab in alvo.xpath(".//table"):
        div = html.Element("div", {"class":"scroll"})
        tab.addprevious(div)
        div.append(tab)
    for paragrafo in alvo.xpath(".//blockquote/p"):
        for marca, nivel in (("RECUOA ", "1"), ("RECUOB ", "2")):
            if paragrafo.text and paragrafo.text.startswith(marca):
                paragrafo.text = paragrafo.text[len(marca):]
                paragrafo.set("class", "recuo-" + nivel)
    for imagem in alvo.xpath(".//figure/img[@src='varredura-alpha.png']"):
        imagem.set("alt", "Retorno final do CartPole por taxa de aprendizagem, com a política uniforme como referência")
    for figura in alvo.xpath(".//figure[img[@src='comparacao.png']]"):
        figura.set("class", "larga")
        imagem = figura.find("img")
        imagem.attrib.pop("style", None)
        imagem.set("alt", "Curvas de treino do CartPole e do FrozenLake por configuração")
        ligacao = html.Element("a", {"href": "comparacao.png"})
        imagem.addprevious(ligacao)
        ligacao.append(imagem)
        legenda = figura.find("figcaption")
        abrir = html.Element("a", {"href": "comparacao.png"})
        abrir.text = "Abrir a figura em tamanho real."
        abrir.tail = None
        if len(legenda):
            legenda[-1].tail = (legenda[-1].tail or "") + " "
        else:
            legenda.text = (legenda.text or "") + " "
        legenda.append(abrir)
    for notas in alvo.xpath(".//section[@id='footnotes']"):
        notas.set("class", "sec notas footnotes")
        linha = notas.find("hr")
        titulo = html.Element("h2")
        titulo.text = "Notas"
        if linha is not None:
            linha.addprevious(titulo)
            notas.remove(linha)
        else:
            notas.insert(0, titulo)


def atualizar_readme():
    arquivo = RAIZ / "README.md"
    inicio, resto = arquivo.read_text(encoding="utf-8").split("<!-- teoria:inicio -->")
    _, fim = resto.split("<!-- teoria:fim -->")
    corpo = corpo_texto().replace("../media/", "media/")
    # Compatibilidade tipográfica do README com o renderizador do GitHub.
    # Um decimal inteiro em texto evita que a vírgula seja tratada como pontuação.
    corpo = re.sub(r"(\d+)\{,\}(\d+)", r"\\text{\1,\2}", corpo)
    corpo = corpo.replace(r"\operatorname{ReLU}", r"\mathrm{ReLU}")
    corpo = corpo.replace(r"\operatorname{softmax}", r"\mathrm{softmax}")
    corpo = re.sub(r"\\ln\b\s*(?!\\,)", lambda _: r"\ln\,", corpo)
    # Glifos Unicode explícitos não dependem do mathvariant do MathML no Chrome.
    for comando, letra, glifo in (("mathbb", "E", "𝔼"), ("mathcal", "E", "ℰ"),
                                  ("mathcal", "D", "𝒟"), ("mathbf", "1", "𝟏")):
        padrao = rf"\\{comando}\s*(?:\{{\s*{letra}\s*\}}|{letra})"
        corpo = re.sub(padrao, lambda _, g=glifo: rf"\text{{{g}}}", corpo)
    comando = [PANDOC, "-f", "latex", "-t", "gfm+tex_math_dollars", "--wrap=none",
               "--shift-heading-level-by=1"]
    proc = subprocess.run(comando, input=corpo, encoding="utf-8", text=True,
                          capture_output=True, check=True)
    if proc.stderr.strip():
        raise ValueError(proc.stderr)
    md = proc.stdout.strip()
    md = md.replace("RECUOB ", "&emsp;&emsp;&emsp;&emsp;").replace("RECUOA ", "&emsp;&emsp;")
    arquivo.write_text(inicio+"<!-- teoria:inicio -->\n\n"+md+
                       "\n\n<!-- teoria:fim -->"+fim,encoding="utf-8")


def main():
    atualizar_readme()
    for arquivo in sorted(FONTES.glob("*.tex")):
        destino = SITE / (arquivo.stem+".html")
        doc = html.document_fromstring(destino.read_text(encoding="utf-8"))
        if arquivo.stem == "teoria":
            teoria(doc)
        compilar_blocos(doc, arquivo)
        if arquivo.stem == "glossario":
            lista, = doc.xpath('//dl[@class="gloss"]')
            for item in sorted(lista, key=lambda el: unicodedata.normalize("NFD", el.find("dt").text_content().casefold()).encode("ascii", "ignore")):
                lista.append(item)
        for math in doc.xpath("//math"):
            # Elimina duplicatas de TeX bruto em leitores de tela e na busca.
            for anotacao in math.xpath(".//annotation"):
                anotacao.getparent().remove(anotacao)
            for chave in ("alttext","alt"):
                math.attrib.pop(chave, None)
            for numero in math.xpath(".//mn"):
                if numero.text in MARCADORES:
                    numero.set("data-numero", MARCADORES[numero.text])
                    numero.text = "0"
            unir_decimais(math)
            espacar_funcoes(math)
            manter_sufixo(math)
        destino.write_text("<!doctype html>\n"+etree.tostring(doc,encoding="unicode",method="html")+"\n",
                           encoding="utf-8")


def unir_decimais(math):
    for virgula in math.xpath(".//mo[@mathvariant='normal'][.=',']"):
        antes, depois = virgula.getprevious(), virgula.getnext()
        if antes is None or depois is None or antes.tag != "mn":
            continue
        alvo = depois if depois.tag == "mn" else (depois[0] if depois.tag in ("msup", "msub", "msubsup") and len(depois) and depois[0].tag == "mn" else None)
        if alvo is None:
            continue
        alvo.text = antes.text + "," + alvo.text
        pai = virgula.getparent()
        pai.remove(antes)
        pai.remove(virgula)


FUNCOES = {"ln", "log", "exp", "max", "min", "Pr", "softmax", "ReLU"}
ORDINARIOS = {"mn", "mi", "msub", "msup", "msubsup", "mfrac", "mstyle"}


def espacar_funcoes(math):
    # Fonte TeX: um espaço fino separa o nome da função de um argumento sem parênteses.
    for nome in math.xpath(".//mrow[mi and mo[.='\u2061']]"):
        if nome[0].text not in FUNCOES:
            continue
        depois, antes = nome.getnext(), nome.getprevious()
        if depois is not None and depois.tag != "mspace" and not (depois.tag == "mo" and depois.get("form") == "prefix"):
            nome.addnext(html.Element("mspace", {"width": "0.167em"}))
        if antes is not None and antes.tag != "mspace" and antes.tag in ORDINARIOS and (antes.text or "").strip() not in {"−", "+", "="}:
            nome.addprevious(html.Element("mspace", {"width": "0.167em"}))


def manter_sufixo(math):
    sufixo = re.match(r"(-[^\W\d_]+)(.*)", math.tail or "", re.S)
    pai = math.getparent()
    if not sufixo or (pai is not None and pai.get("class") == "sem-quebra"):
        return
    caixa = html.Element("span", {"class": "sem-quebra"})
    math.tail = None
    math.addprevious(caixa)
    caixa.append(math)
    math.tail = sufixo.group(1)
    caixa.tail = sufixo.group(2)


# Os valores iniciais nos modelos numéricos são substituídos pela simulação.
MARCADORES = {"99101":"recompensa","99102":"gamma","99103":"duracao","99104":"escore",
              "99105":"p","99106":"complemento","99107":"verossimilhanca","99108":"perda",
              "99109":"z0","99110":"z1"}

if __name__ == "__main__":
    main()

