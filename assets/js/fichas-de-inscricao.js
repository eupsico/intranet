<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Formulário de Inscrição - EuPsico</title>
    <link rel="stylesheet" href="../assets/css/design-system.css">
    <style>
        body {
            background-color: var(--cor-fundo);
            font-family: var(--fonte-principal);
            color: var(--cor-texto-principal);
        }
        .form-container {
            max-width: 800px;
            margin: 40px auto;
            background-color: var(--cor-surface);
            padding: 30px 40px;
            border-radius: var(--borda-radius);
            box-shadow: var(--sombra-padrao);
        }
        .form-header {
            text-align: center;
            margin-bottom: 30px;
        }
        .form-header img {
            max-width: 150px;
            margin-bottom: 15px;
        }
        .instrucoes {
            background-color: var(--cor-fundo-box);
            padding: 25px;
            border-radius: var(--borda-radius);
            margin-bottom: 30px;
            border-left: 5px solid var(--cor-primaria);
        }
        .instrucoes-header {
            text-align: center;
            margin-bottom: 25px;
        }
        .instrucoes-header h4 {
            font-size: 1.4em;
            color: var(--cor-texto-principal);
            margin-bottom: 5px;
        }
        .instrucoes-passos {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .passo {
            display: flex;
            align-items: flex-start;
            gap: 15px;
        }
        .passo-numero {
            flex-shrink: 0;
            width: 35px;
            height: 35px;
            background-color: var(--cor-primaria);
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2em;
            font-weight: bold;
        }
        .passo-texto {
            line-height: 1.6;
        }
        .passo-texto ul {
            padding-left: 20px;
            margin-top: 10px;
            list-style-type: '✓ ';
            color: var(--cor-texto-secundario);
        }
        .form-section-title {
            font-size: 1.5em;
            color: var(--cor-primaria);
            margin-top: 30px;
            margin-bottom: 20px;
            border-bottom: 2px solid var(--cor-secundaria);
            padding-bottom: 10px;
        }
        .form-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
        }
        .form-group p {
            font-size: 0.85em;
            color: var(--cor-texto-secundario);
            margin-top: 5px;
        }
        .required-asterisk {
            color: var(--cor-erro);
        }
        .hidden-section {
            display: none;
        }
        .horarios-options-container {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 15px;
            margin-top: 10px;
            margin-bottom: 20px;
        }
        .horario-detalhe-container {
            background-color: var(--cor-fundo-box);
            padding: 15px;
            border-radius: var(--borda-radius);
            margin-top: 10px;
        }
        .horario-detalhe-container label {
            font-weight: bold;
            display: block;
            margin-bottom: 10px;
        }
        .horario-detalhe-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
            gap: 10px;
        }
    </style>
</head>
<body>

    <div class="form-container">
        <div class="form-header">
            <img src="../assets/img/logo-eupsico.png" alt="Logo EuPsico">
            <h2>Ficha de Inscrição</h2>
        </div>

        <div class="instrucoes">
            <div class="instrucoes-header">
                <h4>Seja bem-vindo(a) à EuPsico!</h4>
                <p>Para cuidar da sua saúde mental conosco, siga os passos abaixo:</p>
            </div>
            <div class="instrucoes-passos">
                <div class="passo">
                    <div class="passo-numero">1</div>
                    <div class="passo-texto"><strong>Preencha este formulário</strong> com atenção e informações corretas.</div>
                </div>
                <div class="passo">
                    <div class="passo-numero">2</div>
                    <div class="passo-texto">
                        <strong>Envie seus documentos</strong> pelo nosso WhatsApp:
                        <ul>
                            <li>RG e CPF (do paciente e/ou responsável);</li>
                            <li>Comprovante de renda atualizado;</li>
                            <li>Comprovante de endereço com CEP.</li>
                        </ul>
                    </div>
                </div>
                <div class="passo">
                    <div class="passo-numero">3</div>
                    <div class="passo-texto"><strong>Realize a contribuição de R$30,00</strong>, referente à triagem, após o envio dos documentos.</div>
                </div>
                <div class="passo">
                    <div class="passo-numero">4</div>
                    <div class="passo-texto"><strong>Aguarde o agendamento da sua Triagem</strong>, onde faremos uma avaliação socioeconômica para definir os valores da terapia.</div>
                </div>
                 <div class="passo">
                    <div class="passo-numero">5</div>
                    <div class="passo-texto"><strong>Participe do Acolhimento</strong> (mínimo de 4 encontros) para entendermos sua demanda e realizarmos o melhor encaminhamento.</div>
                </div>
            </div>
        </div>

        <form id="inscricao-form">
            <h3 class="form-section-title">Identificação</h3>
            
            <div class="form-group">
                <label for="cpf">Informe o CPF da pessoa que será atendida: <span class="required-asterisk">*</span></label>
                <input type="text" id="cpf" name="cpf" class="form-control" placeholder="Digite o CPF para iniciar" required>
            </div>
            
            <div id="form-body" class="hidden-section">

                <div id="update-section" class="hidden-section">
                    </div>

                <div id="new-register-section">
                    </div>

                <h3 class="form-section-title">Disponibilidade de Horário</h3>
                </div>
        </form>
    </div>

    <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore-compat.js"></script>
    
    <script type="module" src="../assets/js/firebase-init.js"></script>
    <script type="module" src="../assets/js/fichas-de-inscricao.js"></script>

</body>
</html>