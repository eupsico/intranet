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

    /**
     * Renderiza os cards de informações gerais (Apenas Avisos).
     */
    function renderInfoCard() {
        const aniversariantesHtml = `<li>Nenhum aniversariante hoje.</li>`;
        const reuniaoHtml = `<li>Nenhuma reunião agendada.</li>`;
        infoCardContainer.innerHTML = `
            <div class="info-card-grid">
                <div class="info-card">
                    <h3>📢 Avisos Gerais</h3>
                    <ul>
                        ${aniversariantesHtml}
                        ${reuniaoHtml}
                    </ul>
                </div>
            </div>`;
    }

    async function start() {
        summaryContainer.innerHTML = '<div class="loading-spinner"></div>';
        renderInfoCard();
        await fetchValoresConfig();
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