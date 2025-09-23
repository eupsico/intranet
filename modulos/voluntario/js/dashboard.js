export function init(db, user, userData) {
    const summaryContainer = document.getElementById('summary-panel-container');
    const infoCardContainer = document.getElementById('info-card-container');

    if (!summaryContainer || !infoCardContainer) return;

    let dadosDasGrades = {};
    let valoresConfig = {}; // Armazena a configuração de valores
    const diasDaSemana = {segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado'};

    /**
     * Busca as configurações de valores do financeiro no Firestore.
     */
    async function fetchValoresConfig() {
        try {
            const docRef = db.collection('financeiro').doc('configuracoes');
            const doc = await docRef.get();
            if (doc.exists) {
                const data = doc.data();
                if (data.valores) {
                    valoresConfig = data.valores;
                } else {
                    console.error("Documento 'configuracoes' não possui o campo 'valores'.");
                    valoresConfig = { online: 0, presencial: 0 };
                }
            } else {
                console.error("Documento 'financeiro/configuracoes' não encontrado!");
                valoresConfig = { online: 0, presencial: 0 };
            }
        } catch (error) {
            console.error("Erro ao buscar configurações de valores:", error);
            valoresConfig = { online: 0, presencial: 0 };
        }
    }

    /**
     * Renderiza o painel "Meu Resumo Semanal" com as novas alterações.
     */
    function renderSummaryPanel() {
        if (!userData || !userData.username) {
            summaryContainer.innerHTML = '<p>Não foi possível identificar o usuário para exibir o resumo.</p>';
            return;
        }
        
        const userUsername = userData.username;
        const userFullName = userData.name;
        let horasOnline = 0, horasPresencial = 0;
        let agendamentosOnline = [], agendamentosPresencial = [];
        
        for (const path in dadosDasGrades) {
            const nomeDaGrade = dadosDasGrades[path];
            if (nomeDaGrade === userUsername || nomeDaGrade === userFullName) {
                const parts = path.split('.');
                if (parts.length === 4) {
                    const tipo = parts[0];
                    const diaKey = parts[1];
                    const horaFormatada = parts[2].replace('-', ':');
                    const diaNome = diasDaSemana[diaKey];
                    const horarioCompleto = `<li>${diaNome} - ${horaFormatada}</li>`;

                    if (tipo === 'online') {
                        horasOnline++;
                        agendamentosOnline.push(horarioCompleto);
                    } else if (tipo === 'presencial') {
                        horasPresencial++;
                        agendamentosPresencial.push(horarioCompleto);
                    }
                }
            }
        }

        const valorOnline = valoresConfig.online || 0;
        const valorPresencial = valoresConfig.presencial || 0;
        const totalHoras = horasOnline + horasPresencial;
        const valorTotalAPagar = (horasOnline * valorOnline) + (horasPresencial * valorPresencial);
        const valorFormatado = valorTotalAPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        summaryContainer.innerHTML = `
            <div class="summary-panel">
                <h3>Meu Resumo Semanal</h3>
                <div id="summary-details-container">
                    <div class="summary-card">
                        <h4>💰 Resumo Financeiro</h4>
                        <ul>
                            <li>
                                <span class="financeiro-horas">Total de horas: <strong>${totalHoras}</strong></span>
                                <span class="financeiro-valor">Valor total a pagar: ${valorFormatado}</span>
                               
                                <small>O pagamento deve ser realizado até o dia 10.</small>
                            </li>
                        </ul>
                    </div>
                    <div class="summary-card">
                        <h4>🖥️ Grade Online (${horasOnline})</h4>
                        <ul>${agendamentosOnline.length > 0 ? agendamentosOnline.join('') : '<li>Nenhum horário online.</li>'}</ul>
                    </div>
                    <div class="summary-card">
                        <h4>🏢 Grade Presencial (${horasPresencial})</h4>
                        <ul>${agendamentosPresencial.length > 0 ? agendamentosPresencial.join('') : '<li>Nenhum horário presencial.</li>'}</ul>
                    </div>
                </div>
            </div>`;
    }
    
    // --- INÍCIO DAS NOVAS FUNÇÕES ---

    /**
     * Busca e renderiza os novos cards de informação.
     */
    async function renderInfoCards() {
        let cardsHtml = '';

        // Card de Disponibilidade
        const disponibilidade = userData.horarios && userData.horarios.length > 0 
            ? `${userData.horarios.length} horários cadastrados.`
            : 'Nenhuma disponibilidade cadastrada.';
        cardsHtml += `
            <div class="info-card">
                <h3>🗓️ Minha Disponibilidade</h3>
                <ul>
                    <li>${disponibilidade}</li>
                    <li><a href="#recursos" data-view="recursos">Atualize sua disponibilidade em Recursos do Voluntário.</a></li>
                </ul>
            </div>`;

        // Card de Próxima Supervisão (para voluntários)
        const proximaSupervisao = await getProximaSupervisao('profissional');
        cardsHtml += `
            <div class="info-card">
                <h3>🎓 Próxima Supervisão</h3>
                <ul>
                    <li>${proximaSupervisao}</li>
                </ul>
            </div>`;
        
        // Card de Agendamentos Futuros (apenas para supervisores)
        if (userData.funcoes && userData.funcoes.includes('supervisor')) {
            const agendamentosFuturos = await getAgendamentosFuturosSupervisor();
            cardsHtml += `
                <div class="info-card">
                    <h3>⭐ Agendamentos (Supervisor)</h3>
                    <ul>
                        ${agendamentosFuturos}
                    </ul>
                </div>`;
        }

        infoCardContainer.innerHTML = `<div class="info-card-grid">${cardsHtml}</div>`;
    }

    /**
     * Busca a próxima supervisão agendada.
     */
    async function getProximaSupervisao() {
        try {
            const hoje = new Date();
            const q = db.collection("agendamentos")
                        .where("profissionalUid", "==", user.uid)
                        .where("dataAgendamento", ">=", hoje)
                        .orderBy("dataAgendamento")
                        .limit(1);
            
            const querySnapshot = await q.get();

            if (querySnapshot.empty) {
                return 'Nenhuma supervisão agendada.';
            }

            const agendamento = querySnapshot.docs[0].data();
            const data = agendamento.dataAgendamento.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `<strong>${data}</strong> com ${agendamento.supervisorNome}`;

        } catch (error) {
            console.error("Erro ao buscar próxima supervisão:", error);
            return "Não foi possível carregar a informação.";
        }
    }

    /**
     * Busca os próximos agendamentos para um supervisor.
     */
    async function getAgendamentosFuturosSupervisor() {
        try {
            const hoje = new Date();
            const q = db.collection("agendamentos")
                        .where("supervisorUid", "==", user.uid)
                        .where("dataAgendamento", ">=", hoje)
                        .orderBy("dataAgendamento");
            
            const querySnapshot = await q.get();

            if (querySnapshot.empty) {
                return '<li>Nenhum agendamento futuro.</li>';
            }

            return querySnapshot.docs.map(doc => {
                const agendamento = doc.data();
                const data = agendamento.dataAgendamento.toDate().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                return `<li><strong>${data}</strong> com ${agendamento.profissionalNome}</li>`;
            }).join('');

        } catch (error) {
            console.error("Erro ao buscar agendamentos do supervisor:", error);
            return "<li>Não foi possível carregar os agendamentos.</li>";
        }
    }

    // --- FIM DAS NOVAS FUNÇÕES ---


    async function start() {
        summaryContainer.innerHTML = '<div class="loading-spinner"></div>';
        infoCardContainer.innerHTML = ''; // Limpa a área de cards de informação
        
        await fetchValoresConfig();
        renderInfoCards(); // Chama a nova função para renderizar os cards
        
        const gradesDocRef = db.collection('administrativo').doc('grades');
        gradesDocRef.onSnapshot((doc) => {
            dadosDasGrades = doc.exists ? doc.data() : {};
            renderSummaryPanel();
        }, (error) => {
            console.error("Erro ao carregar resumo da grade:", error);
            summaryContainer.innerHTML = `<p class="alert alert-error">Não foi possível carregar o resumo semanal.</p>`;
        });
    }

    start().catch(console.error);
}