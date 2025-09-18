// Arquivo: /modulos/voluntario/js/recursos.js
// Versão: 2.3
// Descrição: Corrige o bug ao adicionar nova linha de horário quando a tabela está vazia.

export function init(db, user, userData) {
    const view = document.querySelector('.view-container');
    if (!view) return;

    const tabState = {
        mensagens: false,
        disponibilidade: false
    };

    // --- LÓGICA GERAL DAS ABAS ---
    const tabContainer = view.querySelector('.tabs-container');
    const contentSections = view.querySelectorAll('.tab-content');
    if (tabContainer) {
        tabContainer.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.classList.contains('tab-link')) {
                const tabId = e.target.dataset.tab;
                tabContainer.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                contentSections.forEach(section => {
                    section.style.display = section.id === tabId ? 'block' : 'none';
                });

                if (tabId === 'mensagens' && !tabState.mensagens) initMensagens();
                if (tabId === 'disponibilidade' && !tabState.disponibilidade) initDisponibilidade();
            }
        });
    }

    // ######################################################
    // ### INÍCIO DA LÓGICA DA ABA 1: MODELOS DE MENSAGEM ###
    // ######################################################
    function initMensagens() {
        if (tabState.mensagens) return;
        const container = view.querySelector('#mensagens');
        if (!container) return;

        const getGreeting = () => {
            const h = new Date().getHours();
            if (h >= 5 && h < 12) return 'Bom dia';
            if (h >= 12 && h < 18) return 'Boa tarde';
            return 'Boa noite';
        };
        const getFutureDate = (days) => {
            const d = new Date();
            d.setDate(d.getDate() + days);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        };
        const formatDateTimeLocalString = (str) => {
            if (!str) return '';
            const d = new Date(str);
            const week = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
            return `${week[d.getDay()]}, ${d.toLocaleDateString('pt-BR')} às ${String(d.getHours()).padStart(2, '0')}h`;
        };
        const formatDateToDDMM = (str) => !str ? '' : `${str.split('-')[2]}/${str.split('-')[1]}`;
        const generateAndCopy = (el, msg) => {
            el.value = msg;
            el.select();
            navigator.clipboard.writeText(msg).then(() => alert('Mensagem copiada!'))
                .catch(() => alert('Falha ao copiar. Copie manualmente.'));
        };

        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        container.querySelector('#cobranca-mes').innerHTML = meses.map(m => `<option value="${m}">${m}</option>`).join('');
        let hoursOptions = '';
        for (let i = 8; i <= 21; i++) {
            const hour = String(i).padStart(2, '0') + ':00';
            hoursOptions += `<option value="${hour}">${hour}</option>`;
        }
        container.querySelector('#agendada-hora').innerHTML = hoursOptions;
        container.querySelector('#agendar-hora').innerHTML = hoursOptions.replace(/:00/g, 'h');

        const triggers = container.querySelectorAll('.accordion-trigger');
        triggers.forEach(trigger => {
            trigger.addEventListener('click', function () {
                const isActive = this.classList.contains('active');
                triggers.forEach(t => {
                    t.classList.remove('active');
                    const c = t.nextElementSibling;
                    c.classList.remove('active');
                    c.style.maxHeight = null;
                });
                if (!isActive) {
                    this.classList.add('active');
                    const content = this.nextElementSibling;
                    content.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
            });
        });

        container.querySelector('#btn-cobranca').addEventListener('click', function () {
            const p = container.querySelector('#cobranca-paciente').value, d = container.querySelector('#cobranca-data').value, m = container.querySelector('#cobranca-mes').value, v = container.querySelector('#cobranca-valor').value, px = container.querySelector('#cobranca-pix').value;
            const msg = `${getGreeting()}, ${p}!\n\nPassando para lembrar sobre a sua contribuição mensal, com vencimento em *${formatDateToDDMM(d)}*.\n\n*Ao contribuir, você garante a continuidade do seu atendimento e apoia o trabalho da EuPsico.* 😊\n\n*Mês de Referência:* ${m}\n*Valor:* R$ ${v}\n*Chave PIX:* ${px}\n\nQualquer dúvida, estou à disposição.`;
            generateAndCopy(container.querySelector('#output-cobranca'), msg);
        });
        container.querySelector('#btn-agendada').addEventListener('click', function () {
            const tipo = container.querySelector('#agendada-tipo').value, p = container.querySelector('#agendada-paciente').value, t = container.querySelector('#agendada-terapeuta').value, prof = container.querySelector('#agendada-profissao').value, dia = container.querySelector('#agendada-diasemana').value, data = container.querySelector('#agendada-data').value, hora = container.querySelector('#agendada-hora').value;
            let intro = tipo === 'plantao' ? `Meu nome é ${t} e sou o/a ${prof} da EuPsico que irá realizar seu atendimento no Plantão Psicológico.` : `Meu nome é ${t} e sou o/a ${prof} da EuPsico que irá realizar seu atendimento.`;
            let msg = tipo === 'plantao' ? `${getGreeting()}, ${p}!\n\n${intro}\n\nEscrevo para confirmar nossa primeira sessão:\n✨ *${dia}, ${formatDateToDDMM(data)} às ${hora}* ✨\n\nPara que você se sinta mais confortável para o nosso encontro, gostaria de explicar como funciona este acolhimento inicial. O Plantão Psicológico é um *atendimento breve e focado* (de até quatro sessões), onde nosso objetivo será:\n\n➡️ *Identificar sua demanda principal:* Compreender as questões que levaram você a buscar ajuda neste momento.\n➡️ *Avaliar sua necessidade:* Analisar a urgência e a natureza da sua queixa.\n➡️ *Realizar o encaminhamento adequado:* Direcionar você para a modalidade de terapia mais indicada ao final do nosso processo.\n\nDois pontos importantes sobre este formato:\n1. O Plantão funciona como uma porta de entrada. Ele *não é um processo psicoterapêutico completo*, mas sim o primeiro passo para o cuidado contínuo.\n2. Como profissional do Plantão, meu papel é te acolher e direcionar da melhor forma. Por isso, a terapia contínua, se for o caso, será realizada por *outro colega*, garantindo um encaminhamento isento e focado no que é melhor para você.\n\nSou ${prof} com registro profissional, e nosso atendimento é totalmente protegido pelo sigilo e pela ética profissional.\n\nSe tiver qualquer dúvida antes da nossa sessão, pode me perguntar. Estou à disposição para te acolher nesta jornada.` : `${getGreeting()}, ${p}!\n\n${intro}\n\nEscrevo para confirmar nossa primeira sessão:\n✨ *${dia}, ${formatDateToDDMM(data)} às ${hora}* ✨\n\nCaso precise remarcar, por favor, me avise com no mínimo 24 horas de antecedência.\n\nAté lá!`;
            generateAndCopy(container.querySelector('#output-agendada'), msg);
        });
        container.querySelector('#btn-agendar').addEventListener('click', function () {
            const p = container.querySelector('#agendar-paciente').value, t = container.querySelector('#agendar-terapeuta').value, prof = container.querySelector('#agendar-profissao').value, mod = container.querySelector('#agendar-modalidade').value, dia = container.querySelector('#agendar-diasemana').value, hora = container.querySelector('#agendar-hora').value;
            const msg = `${getGreeting()}, ${p}!\n\nSou ${t}, ${prof} na EuPsico.\n\nTenho uma vaga disponível para você no seguinte horário:\n*- Modalidade:* ${mod}\n*- Dia e Hora:* ${dia}, às ${hora}.\n\nEste horário funciona para você?\n\nAguardo sua confirmação para darmos os próximos passos. 😉`;
            generateAndCopy(container.querySelector('#output-agendar'), msg);
        });
        container.querySelector('#btn-primeira').addEventListener('click', function () {
            const p = container.querySelector('#primeira-paciente').value, data = container.querySelector('#primeira-data-agendamento').value, v = container.querySelector('#primeira-valor').value, px = container.querySelector('#primeira-pix').value;
            const msg = `Olá, ${p}! Que bom que o horário funcionou para você.\n\nPara confirmarmos e garantirmos sua vaga, o próximo passo é realizar o pagamento da primeira contribuição.\n\n*Agendamento:* ${formatDateTimeLocalString(data)}\n*Valor:* R$ ${v}\n*Chave PIX:* ${px}\n\n*Prazo para envio do comprovante:* ${getFutureDate(2)}\n\nSeu horário será confirmado assim que recebermos o comprovante. Qualquer dúvida, é só chamar!`;
            generateAndCopy(container.querySelector('#output-primeira'), msg);
        });

        tabState.mensagens = true;
    }

    // ###########################################################
    // ### INÍCIO DA LÓGICA DA ABA 2: MINHA DISPONIBILIDADE ###
    // ###########################################################
    function initDisponibilidade() {
        if (tabState.disponibilidade) return;
        const container = view.querySelector('#disponibilidade-container');
        
        async function fetchData() {
            container.innerHTML = '<div class="loading-spinner"></div>';
            try {
                const userDoc = await db.collection('usuarios').doc(user.uid).get();
                if (userDoc.exists) {
                    renderUserView(userDoc.data());
                } else {
                     container.innerHTML = `<div class="disponibilidade-view"><h3>Minha Disponibilidade</h3><p>Seus dados não foram encontrados.</p></div>`;
                }
            } catch(error) {
                console.error("Erro ao buscar dados de disponibilidade:", error);
                container.innerHTML = `<p class="alert alert-error">Não foi possível carregar os dados.</p>`;
            }
        }
        
        function renderUserView(profData) {
            const horariosHtml = profData.horarios && profData.horarios.length > 0
                ? profData.horarios.map(h => `<li><strong>${h.dia.charAt(0).toUpperCase() + h.dia.slice(1)} - ${String(h.horario).padStart(2,'0')}:00:</strong> ${h.modalidade} (${h.status})</li>`).join('')
                : '<li>Nenhum horário cadastrado.</li>';

            container.innerHTML = `
                <div class="disponibilidade-view">
                    <div class="display-header">
                        <h3>Horários Salvos</h3>
                        <button class="action-button modify-btn">Modificar</button>
                    </div>
                    <div class="display-body">
                        <ul class="schedule-list">${horariosHtml}</ul>
                        <div class="demands-display">
                            <h4>Demandas que NÃO atende:</h4>
                            <p>${profData.demandasNaoAtendidas || 'Nenhuma restrição informada.'}</p>
                        </div>
                    </div>
                </div>
            `;
            container.querySelector('.modify-btn').addEventListener('click', () => renderEditView(profData));
        }

        // ALTERAÇÃO: Criada função separada para gerar o HTML de uma nova linha
        function createNewScheduleRowHtml() {
            const dias = {segunda:"Segunda-feira", terca:"Terça-feira", quarta:"Quarta-feira", quinta:"Quinta-feira", sexta:"Sexta-feira", sabado:"Sábado"};
            const horarios = Array.from({length: 15}, (_, i) => i + 7); // 7h às 21h
            
            return `
                <tr>
                    <td><select class="dia">${Object.entries(dias).map(([val, text]) => `<option value="${val}">${text}</option>`).join('')}</select></td>
                    <td><select class="horario">${horarios.map(hora => `<option value="${hora}">${String(hora).padStart(2,'0')}:00</option>`).join('')}</select></td>
                    <td><select class="modalidade"><option value="online">Online</option><option value="presencial">Presencial</option><option value="ambas">Ambas</option></select></td>
                    <td><select class="status"><option value="disponivel">Disponível</option><option value="ocupado">Ocupado</option></select></td>
                    <td><button class="delete-row-btn">Excluir</button></td>
                </tr>
            `;
        }

        function renderEditView(profData) {
            const scheduleRowsHtml = (profData.horarios && profData.horarios.length > 0 ? profData.horarios : [])
            .map(h => {
                const dias = {segunda:"Segunda-feira", terca:"Terça-feira", quarta:"Quarta-feira", quinta:"Quinta-feira", sexta:"Sexta-feira", sabado:"Sábado"};
                const horarios = Array.from({length: 15}, (_, i) => i + 7); // 7h às 21h
                return `
                <tr>
                    <td><select class="dia">${Object.entries(dias).map(([val, text]) => `<option value="${val}" ${h.dia === val ? 'selected' : ''}>${text}</option>`).join('')}</select></td>
                    <td><select class="horario">${horarios.map(hora => `<option value="${hora}" ${h.horario == hora ? 'selected' : ''}>${String(hora).padStart(2,'0')}:00</option>`).join('')}</select></td>
                    <td><select class="modalidade"><option value="online" ${h.modalidade === 'online' ? 'selected' : ''}>Online</option><option value="presencial" ${h.modalidade === 'presencial' ? 'selected' : ''}>Presencial</option><option value="ambas" ${h.modalidade === 'ambas' ? 'selected' : ''}>Ambas</option></select></td>
                    <td><select class="status"><option value="disponivel" ${h.status === 'disponivel' ? 'selected' : ''}>Disponível</option><option value="ocupado" ${h.status === 'ocupado' ? 'selected' : ''}>Ocupado</option></select></td>
                    <td><button class="delete-row-btn">Excluir</button></td>
                </tr>
            `}).join('');
            
            container.innerHTML = `
                <div class="disponibilidade-view">
                    <h3>Editando Minha Disponibilidade</h3>
                    <p class="description-box">Como a EuPsico não trabalha somente com voluntários, é preciso que cada um assuma a responsabilidade de informar a sua disponibilidade correta para o setor administrativo.</p>
                    <table class="edit-table">
                        <thead><tr><th>Dia da Semana</th><th>Horário</th><th>Modalidade</th><th>Status</th><th>Ação</th></tr></thead>
                        <tbody>${scheduleRowsHtml}</tbody>
                    </table>
                    <button class="action-button add-row-btn">Adicionar Horário (+)</button>
                    <hr style="margin: 20px 0;">
                    <div class="form-group">
                        <label for="demands-textarea">Demandas que NÃO atende:</label>
                        <textarea id="demands-textarea" class="demands" placeholder="Ex: Crianças abaixo de 10 anos, casos de abuso sexual, etc.">${profData.demandasNaoAtendidas || ''}</textarea>
                    </div>
                    <div class="edit-controls">
                        <button class="action-button cancel-btn">Cancelar</button>
                        <button class="action-button save-btn">Salvar Alterações</button>
                    </div>
                </div>
            `;
            
            // Listeners da visão de edição
            container.querySelector('.add-row-btn').addEventListener('click', () => {
                // ALTERAÇÃO: Usa a função de template para criar uma nova linha, evitando o erro.
                const newRowHtml = createNewScheduleRowHtml();
                container.querySelector('.edit-table tbody').insertAdjacentHTML('beforeend', newRowHtml);
            });
            container.querySelector('.edit-table tbody').addEventListener('click', (e) => { 
                if (e.target.classList.contains('delete-row-btn')) e.target.closest('tr').remove(); 
            });
            container.querySelector('.cancel-btn').addEventListener('click', () => renderUserView(profData));
            container.querySelector('.save-btn').addEventListener('click', () => saveAvailability(user.uid));
        }

        async function saveAvailability(uid) {
            const saveButton = container.querySelector('.save-btn');
            saveButton.disabled = true;
            saveButton.textContent = 'Salvando...';

            const updatedHorarios = [];
            container.querySelectorAll('.edit-table tbody tr').forEach(row => {
                const dia = row.querySelector('.dia').value;
                const horario = row.querySelector('.horario').value;
                if (dia && horario) {
                    updatedHorarios.push({
                        dia: dia,
                        horario: parseInt(horario),
                        modalidade: row.querySelector('.modalidade').value,
                        status: row.querySelector('.status').value
                    });
                }
            });
            const updatedDemands = container.querySelector('.demands').value;
            
            try {
                await db.collection('usuarios').doc(uid).update({
                    horarios: updatedHorarios,
                    demandasNaoAtendidas: updatedDemands
                });
                window.showToast('Disponibilidade salva com sucesso!', 'success');
                fetchData(); // Recarrega os dados e a view
            } catch(error) {
                console.error("Erro ao salvar disponibilidade:", error);
                window.showToast('Erro ao salvar disponibilidade.', 'error');
                saveButton.disabled = false;
                saveButton.textContent = 'Salvar Alterações';
            }
        }

        fetchData();
        tabState.disponibilidade = true;
    }

    // Inicializa a primeira aba por padrão
    initMensagens();
}