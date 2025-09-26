// Arquivo: /modulos/servico-social/js/dashboard-servico-social.js
// Versão: 2.0 (Exibe a disponibilidade de todos os meses futuros cadastrados)

export function init(db, user, userData) {
    const summaryContainer = document.getElementById('summary-panel-container');
    const agendamentosContainer = document.getElementById('agendamentos-card-container');

    if (!summaryContainer || !agendamentosContainer) return;

    // --- 1. Lógica do Card de Disponibilidade (MODIFICADO) ---
    async function renderDisponibilidade() {
        try {
            const docRef = db.collection('disponibilidadeAssistentes').doc(user.uid);
            const docSnap = await docRef.get();

            let disponibilidadeHtml = '<p style="padding: 0 15px;">Nenhuma disponibilidade futura informada.</p>';

            if (docSnap.exists) {
                const data = docSnap.data();
                const disponibilidadeMap = data.disponibilidade;

                if (disponibilidadeMap && Object.keys(disponibilidadeMap).length > 0) {
                    
                    // Pega o ano e mês atual para filtrar meses passados
                    const hoje = new Date();
                    hoje.setDate(1); // Normaliza para o primeiro dia do mês
                    
                    // Filtra apenas os meses a partir do mês corrente e ordena
                    const mesesOrdenados = Object.keys(disponibilidadeMap)
                        .filter(mesKey => {
                            const [ano, mes] = mesKey.split('-');
                            const dataKey = new Date(ano, parseInt(mes) - 1, 1);
                            return dataKey >= hoje;
                        })
                        .sort();

                    if (mesesOrdenados.length > 0) {
                        disponibilidadeHtml = ''; // Limpa a mensagem padrão
                        
                        // Função para formatar os detalhes de cada modalidade (Online/Presencial)
                        const formatarModalidade = (dados) => {
                            // Usa os dias de 'triagem' como fonte da verdade, já que são os mesmos
                            const dias = dados?.triagem?.dias;
                            if (!dias || dias.length === 0) {
                                return '<li>Nenhum horário informado.</li>';
                            }
                            const diasFormatados = dias.map(d => d.split('-')[2]).join(', ');
                            const { inicio, fim } = dados.triagem;
                            return `<li>Dias ${diasFormatados} (das ${inicio} às ${fim})</li>`;
                        };

                        // Itera sobre cada mês futuro cadastrado
                        mesesOrdenados.forEach(mesKey => {
                            const [ano, mes] = mesKey.split('-');
                            const dataReferencia = new Date(ano, parseInt(mes) - 1, 1);
                            const nomeMes = dataReferencia.toLocaleString('pt-BR', { month: 'long' });
                            const nomeMesCapitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);
                            
                            const dadosDoMes = disponibilidadeMap[mesKey];
                            const onlineHtml = formatarModalidade(dadosDoMes.online);
                            const presencialHtml = formatarModalidade(dadosDoMes.presencial);

                            // Monta o HTML para o mês específico
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
            
            // Renderiza o card com o título fixo e o conteúdo dinâmico
            summaryContainer.innerHTML = `
                <div class="summary-card">
                    <h4>🗓️ Minha Disponibilidade</h4>
                    ${disponibilidadeHtml}
                    <a href="#disponibilidade-assistente" class="card-footer-link">Clique aqui para modificar</a>
                </div>`;

        } catch (error) {
            console.error("Erro ao carregar disponibilidade:", error);
            summaryContainer.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Não foi possível carregar a disponibilidade.</div>`;
        }
    }

    // --- 2. Lógica do Card de Agendamentos (sem alterações) ---
    async function renderAgendamentos() {
        // ... (código inalterado)
    }

    // --- Inicialização ---
    renderDisponibilidade();
    renderAgendamentos();
}