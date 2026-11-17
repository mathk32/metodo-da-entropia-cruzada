# Executar os experimentos

Os comandos partem da raiz do repositório. A instalação foi verificada com Python 3.12 em Windows. A execução usa CPU e dispensa interface gráfica. Crie um ambiente virtual e instale as versões fixadas.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Em Linux ou macOS, execute na raiz:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python scripts/experimento.py
```

## Observar a seleção em um único treinamento

```powershell
.\.venv\Scripts\python.exe scripts/cem.py --ambiente FrozenLake-v1 --semente 17 --rho 0.3 --lote 16 --iteracoes 3
.\.venv\Scripts\python.exe scripts/cem.py --ambiente CartPole-v1 --semente 17
```

Em Linux ou macOS:

```sh
.venv/bin/python scripts/cem.py --ambiente FrozenLake-v1 --semente 17 --rho 0.3 --lote 16 --iteracoes 3
.venv/bin/python scripts/cem.py --ambiente CartPole-v1 --semente 17
```

No lago, o primeiro lote tem retorno médio zero. Nos dois seguintes, um episódio entre 16 chega ao objetivo em cada lote. O retorno médio impresso é 0,06 e os três lotes têm elite de 100%. No carrinho, o lote inicial apresenta média 19,94 e as 30 linhas permitem acompanhar a evolução. O limiar é interpolado e pode ser fracionário mesmo quando cada retorno individual é inteiro.

Em `cem.py`, `coletar` sorteia ações da política, `selecionar` calcula o quantil e `ajustar` dá oito passos de gradiente. As duas primeiras páginas permitem conferir o efeito dos empates e o sinal do gradiente. [Selecionar episódios](https://metodo-da-entropia-cruzada.vercel.app/selecao.html) · [Ajustar a política](https://metodo-da-entropia-cruzada.vercel.app/politica.html)

## Reproduzir os dados e as figuras

```powershell
.\.venv\Scripts\python.exe scripts/experimento.py
```

O comando executa 22 configurações em cinco sementes, totalizando 110 execuções, 3.300 lotes e 52.800 episódios. Grava os dados por lote (resultados.csv), os indicadores por configuração (resumo.csv) e as figuras comparacao.png e varredura-alpha.png em `media/` e atualiza as cópias públicas em `site/dist/`. [Explorar as medições](https://metodo-da-entropia-cruzada.vercel.app/experimento.html)

No carrinho e no lago escorregadio, o CEM inclusivo usa frações 0,1, 0,3, 0,6 e 1. A fração 1 treina com todos os episódios. A referência uniforme também usa 1 no CSV, mas tem `metodo=Política uniforme` e conserva os pesos em zero. Para a comparação do lago, cruzam-se as regras inclusiva e estrita com e sem deslizamento a 30% de elite, além da referência uniforme em cada superfície. A configuração inclusiva no gelo é compartilhada entre as duas comparações.

| Configuração | CartPole (passos) | Lago escorregadio (sucessos) | Lago determinístico (sucessos) |
|---|---:|---:|---:|
| Política uniforme | 22,59 | 1,50% | 0,75% |
| CEM inclusivo, ρ = 1,0 | 22,04 | 1,00% | — |
| CEM inclusivo, ρ = 0,6 | 192,17 | 1,00% | — |
| CEM inclusivo, ρ = 0,3 | 273,37 | 1,00% | 0,75% |
| CEM inclusivo, ρ = 0,1 | 408,73 | 1,00% | — |
| CEM estrito, ρ = 0,3 | — | 3,75% | 52,50% |
| CEM estrito, ρ = 0,3, γ = 0,9 | — | 3,75% | 88,00% |

O CSV publicado foi gerado em Windows com Python 3.12. A tabela compara uma reprodução em Linux com Python 3.13, nas mesmas versões de NumPy (2.2.6) e Gymnasium (1.1.1). Cada par apresenta Windows / Linux, em passos por episódio.

| α | ρ = 0,1 | ρ = 0,3 |
|---:|---:|---:|
| 0,2 | 154,86 / 152,69 | 101,13 / 101,13 |
| 0,8 | 408,73 / 413,89 | 273,37 / 287,57 |
| 2 | 460,59 / 472,83 | 407,74 / 412,04 |
| 5 | 34,65 / 34,65 | 11,42 / 11,42 |

Nessas seis comparações, a maior diferença entre médias agregadas foi 14,20 passos. Uma margem descritiva de 20 passos abrange esses casos. Trajetórias individuais podem divergir com o arredondamento de ponto flutuante. Com α = 0,8, as duas plataformas mantiveram a ordem ρ = 0,1 > 0,3 > 0,6, seguida de ρ = 1 e da política uniforme, ambas próximas de 22. Com α = 5, as duas plataformas deram 34,65 e 11,42 passos, respectivamente para ρ = 0,1 e 0,3; o segundo valor fica abaixo da política uniforme.

A grade cruza α de 0,2, 0,8, 2 e 5 com ρ de 0,1 e 0,3 no carrinho. A variante estrita do lago compara γ de 1 e 0,9 em cada piso. O retorno registrado no lago é sempre a proporção de vitórias. O desconto altera apenas o escore da seleção. Para mudar a configuração principal, use, por exemplo, `--alpha 0.4 --passos-gradiente 4 --lote 32 --saida minha-coleta`. Na grade do carrinho, as quatro taxas de referência continuam disponíveis.

Em `resumo.csv`, `media`, `minimo` e `maximo` resumem as médias finais por semente. No lago, `sucessos` conta chegadas em `episodios_finais` tentativas. No treino inteiro, `vazios_sem_sucesso` e `vazios_com_sucesso` distinguem as duas causas de elite vazia. No carrinho, `cortes_500` conta os lotes cujo limiar atingiu o teto.

Cada resultado resume os cinco lotes finais das sementes 17–21. A coluna `iteracao` identifica o lote (de 0 a 29) e `retorno` é a média de todos os seus episódios antes do ajuste. `regra` e `superficie` distinguem as condições. `fracao_elite` e `limiar` permitem auditar empates e lotes vazios. Para observar a variante estrita diretamente, acrescente `--estrito` ao comando de FrozenLake com `cem.py`; `--sem-gelo` desativa o deslizamento.

## Rodar uma verificação curta

```powershell
.\.venv\Scripts\python.exe scripts/experimento.py --rapido
```

São dez lotes por execução e 1.100 linhas. Nesta máquina Windows, a execução completa levou 59 segundos e a rápida, 10 segundos. Os arquivos ficam em `media/rapido/`. No décimo lote, para ρ = 0,3, o retorno médio entre as cinco sementes é aproximadamente 98,59 no carrinho e 0,0375 no lago. Use `--saida outra-pasta` para mudar o destino, `--semente 37` para começar em outra semente ou `--sementes 8` para aumentar o número de repetições. Alterar as sementes modifica os resultados e as faixas.


## Redesenhar as figuras e o diagrama

```powershell
.\.venv\Scripts\python.exe scripts/experimento.py --so-figuras
.\.venv\Scripts\python.exe scripts/diagrama.py
```

O primeiro comando lê `media/resultados.csv` e refaz `comparacao.png` e `varredura-alpha.png` sem nova coleta; útil para mudar o estilo das figuras sem alterar os dados publicados. O segundo gera `media/ciclo.png`, o diagrama do ciclo usado na teoria.

## Diferenças em relação ao Gym da segunda edição

Na API Gymnasium, `reset` fornece observação e informações. A chamada `step` devolve cinco valores e separa término (a haste caiu, o agente chegou a um buraco ou à meta) de truncamento (limite de passos). No Gym usado na segunda edição de Lapan, o sinal de fim era único.

## Site e simulações

Para servir o site na máquina, execute `python -m http.server 8000 --directory site/dist` na raiz e abra http://localhost:8000. Para publicar na Vercel, use a pasta `site/dist` como site estático. O navegador usa um gerador pseudoaleatório próprio. O CSV registra as execuções do Gymnasium. O download reúne o código das duas versões. Após uma revisão, `python scripts/empacotar.py` atualiza o ZIP.
