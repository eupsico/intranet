// Arquivo: /modulos/servico-social/js/disponibilidade-assistente.js
// Versão: 2.0 (Corrige bug de seleção e implementa salvamento no Firestore)

export function init(db, user, userData) {
    const form = document.getElementById('disponibilidade-form');
    if (!form) return;

    // --- Mapeamento de Elementos ---
    const nomeInput = document.getElementById('assistente-nome');
    const tipoAtendimentoSelect = document.getElementById('tipo-atendimento-triagem');
    const mesSelect = document.getElementById('mes-triagem');
    const horaInicioSelect = document.getElementById('hora-inicio-triagem');
    const horaFimSelect = document.getElementById('hora-fim-triagem');
    const datasTriagemContainer = document.getElementById('datas-container-triagem');
    const datasReavaliacaoContainer = document.getElementById('datas-container-reavaliacao');

    // --- Funções de Inicialização ---
    nomeInput.value = userData.nome || 'Não identificado';

    function popularHoras(selectElement) {
        selectElement.innerHTML = ''; // Limpa antes de popular
        for (let i = 8; i <= 22; i++) {
            const hora = `${String(i).padStart(2, '0')}:00`;
            selectElement.innerHTML += `<option value="${hora}">${hora}</option>`;
        }
    }

    function popularMeses() {
        const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
        const mesAtual = new Date().getMonth();
        mesSelect.innerHTML = '<option value="">Selecione...</option>';
        for (let i = mesAtual; i < 12; i++) {
            mesSelect.innerHTML += `<option value="${i}">${meses[i]}</option>`;
        }
    }

    // --- Lógica de Geração e Exclusão Mútua ---
    function gerarDiasDoMes(mes, ano) {
        datasTriagemContainer.innerHTML = '';
        datasReavaliacaoContainer.innerHTML = '';
        if (mes === "") return;

        const diasNoMes = new Date(ano, parseInt(mes) + 1, 0).getDate();
        const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
        let diasHtmlTriagem = '';
        let diasHtmlReavaliacao = '';
        
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const data = new Date(ano, mes, dia);
            const diaDaSemanaNome = diasSemana[data.getDay()];
            const diaFormatado = `${String(dia).padStart(2, '0')}/${String(parseInt(mes) + 1).padStart(2, '0')}`;
            const dataValue = data.toISOString().split('T')[0]; // Formato YYYY-MM-DD

            diasHtmlTriagem += `
                <div class="checkbox-item">
                    <input type="checkbox" id="triagem-dia-${dia}" name="dias_triagem" value="${dataValue}">
                    <label for="triagem-dia-${dia}">${diaFormatado} - ${diaDaSemanaNome}</label>
                </div>`;
            diasHtmlReavaliacao += `
                <div class="checkbox-item">
                    <input type="checkbox" id="reav-dia-${dia}" name="dias_reavaliacao" value="${dataValue}">
                    <label for="reav-dia-${dia}">${diaFormatado} - ${diaDaSemanaNome}</label>
                </div>`;
        }
        datasTriagemContainer.innerHTML = diasHtmlTriagem;
        datasReavaliacaoContainer.innerHTML = diasHtmlReavaliacao;
    }

    mesSelect.addEventListener('change', () => {
        const anoAtual = new Date().getFullYear();
        gerarDiasDoMes(mesSelect.value, anoAtual);
    });

    // Listener para o container de Triagem
    datasTriagemContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const reavaliacaoCheckbox = datasReavaliacaoContainer.querySelector(`input[value="${e.target.value}"]`);
            if (reavaliacaoCheckbox) {
                reavaliacaoCheckbox.disabled = e.target.checked;
                if(e.target.checked) reavaliacaoCheckbox.checked = false;
            }
        }
    });

    // Listener para o container de Reavaliação
    datasReavaliacaoContainer.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const triagemCheckbox = datasTriagemContainer.querySelector(`input[value="${e.target.value}"]`);
            if (triagemCheckbox) {
                triagemCheckbox.disabled = e.target.checked;
                if(e.target.checked) triagemCheckbox.checked = false;
            }
        }
    });

    // --- Lógica de Salvamento ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveButton = form.querySelector('button[type="submit"]');
        
        const tipoAtendimento = tipoAtendimentoSelect.value;
        const mes = mesSelect.value;
        const ano = new Date().getFullYear();
        const horaInicio = horaInicioSelect.value;
        const horaFim = horaFimSelect.value;
        const diasTriagem = Array.from(datasTriagemContainer.querySelectorAll('input:checked')).map(input => input.value);
        const diasReavaliacao = Array.from(datasReavaliacaoContainer.querySelectorAll('input:checked')).map(input => input.value);

        if (mes === "" || (diasTriagem.length === 0 && diasReavaliacao.length === 0)) {
            alert("Selecione um mês e pelo menos um dia para salvar.");
            return;
        }

        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';

        const docRef = db.collection('disponibilidadeAssistentes').doc(user.uid);

        const dadosParaSalvar = {
            assistenteNome: userData.nome,
            [`disponibilidade.${ano}-${String(parseInt(mes) + 1).padStart(2, '0')}.${tipoAtendimento.toLowerCase()}`]: {
                triagem: {
                    dias: diasTriagem,
                    inicio: horaInicio,
                    fim: horaFim
                },
                reavaliacao: {
                    dias: diasReavaliacao
                }
            },
            atualizadoEm: new Date()
        };

        try {
            await docRef.set(dadosParaSalvar, { merge: true });

            // Lógica de confirmação
            const tipoOposto = tipoAtendimento === 'Online' ? 'Presencial' : 'Online';
            if (confirm(`Disponibilidade ${tipoAtendimento} salva com sucesso! Deseja informar agora os horários para atendimento ${tipoOposto}?`)) {
                // Prepara para o próximo preenchimento
                tipoAtendimentoSelect.value = tipoOposto;
                gerarDiasDoMes(mes, ano); // Limpa as seleções
            } else {
                form.reset();
                popularMeses();
                datasTriagemContainer.innerHTML = '<p>Selecione um mês para ver os dias.</p>';
                datasReavaliacaoContainer.innerHTML = '<p>Selecione um mês para ver os dias.</p>';
            }

        } catch (error) {
            console.error("Erro ao salvar disponibilidade:", error);
            alert("Ocorreu um erro ao salvar. Tente novamente.");
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar Disponibilidade';
        }
    });

    // --- Inicialização ---
    popularHoras(horaInicioSelect);
    popularHoras(horaFimSelect);
    popularMeses();
}