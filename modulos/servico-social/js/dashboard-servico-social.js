// Arquivo: /modulos/servico-social/js/dashboard-servico-social.js
// Versão: 2.2 (Corrige o filtro de data para incluir o mês corrente)

export function init(db, user, userData) {
    const summaryContainer = document.getElementById('summary-panel-container');
    const agendamentosContainer = document.getElementById('agendamentos-card-container');

    if (!summaryContainer || !agendamentosContainer) return;

    // --- 1. Lógica do Card de Disponibilidade ---
    async function renderDisponibilidade() {
        try {
            const docRef = db.collection('disponibilidadeAssistentes').doc(user.uid);
            const docSnap = await docRef.get();

            let disponibilidadeHtml = '<p style="padding: 0 15px;">Nenhuma disponibilidade futura informada.</p>';

            if (docSnap.exists) {
                const data = docSnap.data();
                const disponibilidadeMap = data.disponibilidade;

                if (disponibilidadeMap && Object.keys(disponibilidadeMap).length > 0) {
                    
                    // CORRIGIDO: Zera a hora para garantir que o mês corrente seja incluído na comparação
                    const hoje = new Date();
                    hoje.setDate(1);
                    hoje.setHours(0, 0, 0, 0); // Garante que a comparação seja feita a partir da meia-noite
                    
                    const mesesOrdenados = Object.keys(disponibilidadeMap)
                        .filter(mesKey => {
                            const [ano, mes] = mesKey.split('-');
                            const dataKey = new Date(ano, parseInt(mes) - 1, 1);
                            return dataKey >= hoje; // Agora a comparação funciona para o mês corrente
                        })
                        .sort();

                    if (mesesOrdenados.length > 0) {
                        disponibilidadeHtml = '';
                        
                        const formatarModalidade = (dados) => {
                            if (!dados?.dias || dados.dias.length === 0) {
                                return '<li>Nenhum horário informado.</li>';
                            }
                            const diasFormatados = dados.dias.map(d => d.split('-')[2]).join(', ');
                            return `<li>Dias ${diasFormatados} (das ${dados.inicio} às ${dados.fim})</li>`;
                        };

                        mesesOrdenados.forEach(mesKey => {
                            const [ano, mes] = mesKey.split('-');
                            const dataReferencia = new Date(ano, parseInt(mes) - 1, 1);
                            const nomeMes = dataReferencia.toLocaleString('pt-BR', { month: 'long' });
                            const nomeMesCapitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
                            
                            const dadosDoMes = disponibilidadeMap[mesKey];
                            const onlineHtml = formatarModalidade(dadosDoMes.online);
                            const presencialHtml = formatarModalidade(dadosDoMes.presencial);

                            disponibilidadeHtml += `
                                <div class="disponibilidade-mes">
                                    <strong class="mes-titulo">${nomeMesCapitalizado}</strong>
                                    <strong>Online:</strong>
                                    <ul>${onlineHtml}</ul>
                                    <strong>Presencial:</strong>
                                    <ul>${presencialHtml}</ul>
                                </div>
                            `;
                        });
                    }
                }
            }
            
            summaryContainer.innerHTML = `
                <div class="summary-card">
                    <h4>🗓️ Minha Disponibilidade</h4>
                    ${disponibilidadeHtml}
                    <a href="#disponibilidade-assistente" class="card-footer-link">Clique aqui para modificar</a>
                </div>`;

        } catch (error)
 {
            console.error("Erro ao carregar disponibilidade:", error);
            summaryContainer.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Não foi possível carregar a disponibilidade.</div>`;
        }
    }

    // --- 2. Lógica do Card de Agendamentos (sem alterações) ---
    async function renderAgendamentos() {
        try {
            const inscricoesRef = db.collection('inscricoes').where('status', '==', 'aguardando_triagem').limit(5);
            const snapshot = await inscricoesRef.get();
            let agendamentosHtml = '';

            if (snapshot.empty) {
                agendamentosHtml = '<li>Nenhuma triagem aguardando agendamento.</li>';
            } else {
                snapshot.forEach(doc => {
                    const data = doc.data();
                    const dataInscricao = data.timestamp?.toDate().toLocaleDateString('pt-BR') || 'N/D';
                    agendamentosHtml += `<li><strong>${data.nomeCompleto}</strong> - Inscrito em ${dataInscricao}</li>`;
                });
            }

            agendamentosContainer.innerHTML = `
                <div class="info-card">
                    <h3>✅ Próximos Agendamentos de Triagem</h3>
                    <ul>
                        ${agendamentosHtml}
                    </ul>
                     <a href="#agendamentos-triagem" class="card-footer-link">Ver todos</a>
                </div>`;

        } catch (error) {
            console.error("Erro ao carregar agendamentos:", error);
            agendamentosContainer.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Não foi possível carregar os agendamentos.</div>`;
        }
    }

    // --- CSS Adicional ---
    const style = document.createElement('style');
    style.textContent = `
        .disponibilidade-mes {
            padding: 10px 15px;
            border-top: 1px solid var(--cor-borda);
        }
        .disponibilidade-mes:first-child {
            border-top: none;
            padding-top: 0;
        }
        .mes-titulo {
            display: block;
            font-size: 1.1em;
            color: var(--cor-primaria);
            margin-bottom: 8px;
        }
    `;
    document.head.appendChild(style);

    // --- Inicialização ---
    renderDisponibilidade();
    renderAgendamentos();
}