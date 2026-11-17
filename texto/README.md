# Compilação da teoria

O arquivo `teoria.tex` é a fonte comum da teoria do README, do site e do PDF com diagramação no modelo SBC. O texto usa o diagrama e as figuras em `../media/`. A versão pública é `../site/dist/teoria.pdf`.

Na raiz do repositório, com as dependências numéricas instaladas, execute `python scripts/diagrama.py` para gerar o diagrama em Matplotlib e `python scripts/experimento.py --so-figuras` para redesenhar as duas figuras a partir do `media/resultados.csv` publicado, sem refazer a coleta nem substituir os dados medidos em Windows. Os arquivos são gravados em `media/` e copiados para `site/dist/`.

Na pasta deste documento, execute duas vezes `pdflatex -halt-on-error teoria.tex`. Copie o PDF resultante para `../site/dist/teoria.pdf`. O modelo requer TeX Live ou distribuição equivalente com português, Times, Helvetica, Courier, AMS, booktabs, caption, float e titlesec. O estilo fornecido pelo SBGames inclui nesta cópia o ramo vazio do teste de presença de hyperref, para compatibilidade com as versões recentes do LaTeX. [Arquivos do modelo SBC](https://www.sbgames.org/arquivos/Template_SBC/template-latex/)

As páginas usam HTML sem dependências externas em tempo de execução. O Pandoc compila a prosa e as equações das fontes TeX para HTML e MathML. O texto principal da página Teoria vem de `teoria.tex`. Os trechos próprios da interface ficam em `../site/textos/`. O JavaScript preenche os campos numéricos das fórmulas compiladas durante a simulação.

Use Pandoc 3.x; a versão 2.9 gera HTML diferente do esperado pelo compilador. A versão usada nesta revisão foi a 3.9.

Para atualizar as páginas, disponibilize o executável `pandoc` no PATH, instale as dependências de autoria com `python -m pip install -r requirements-dev.txt` e execute `python compilar_web.py`. O caminho do executável também pode ser indicado na variável de ambiente `PANDOC`. Em seguida, execute `python ../scripts/empacotar.py` para atualizar o ZIP público.


O compilador web também gera a teoria do README entre os marcadores HTML. O cabeçalho e a declaração final são preservados. O pseudocódigo, a legenda e os resultados devem ser editados em teoria.tex antes de recompilar as três saídas.
