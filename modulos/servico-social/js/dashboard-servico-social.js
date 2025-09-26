// Arquivo: /modulos/servico-social/js/dashboard-servico-social.js
// Versão: 1.2 (Sintaxe do Firebase v9 corrigida)

export function init(db, user, userData) {
    const summaryContainer = document.getElementById('summary-panel-container');
    const agendamentosContainer = document.getElementById('agendamentos-card-container');

    if (!summaryContainer || !agendamentosContainer) return;

    // --- 1. Lógica do Card de Disponibilidade ---
// --- 1. Lógica do Card de Disponibilidade ---
    async function renderDisponibilidade() {
        try {
            const docRef = db.collection('disponibilidadeAssistentes').doc(user.uid);
            const docSnap = await docRef.get();

            // NOVO: Pega o mês e ano atuais para buscar os dados corretos
            const hoje = new Date();
            const ano = hoje.getFullYear();
            const mes = String(hoje.getMonth() + 1).padStart(2, '0'); // Garante formato "09"
            const mesKey = `${ano}-${mes}`;
            const nomeMes = hoje.toLocaleString('pt-BR', { month: 'long' });
            const nomeMesCapitalizado = nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1);

            let onlineHtml = '<li>Nenhum horário online informado.</li>';
            let presencialHtml = '<li>Nenhum horário presencial informado.</li>';

            // ALTERADO: Função interna para formatar os dados de disponibilidade
            const formatarDetalhes = (dadosModalidade) => {
                if (!dadosModalidade || (!dadosModalidade.triagem?.dias?.length && !dadosModalidade.reavaliacao?.dias?.length)) {
                    return null; // Retorna nulo se não houver dados
                }
                
                let html = '';
                const { triagem, reavaliacao } = dadosModalidade;

                if (triagem?.dias?.length > 0) {
                    const diasFormatados = triagem.dias.map(d => d.split('-')[2]).join(', ');
                    html += `<li><strong>Triagem:</strong> Dias ${diasFormatados} (das ${triagem.inicio} às ${triagem.fim})</li>`;
                }

                if (reavaliacao?.dias?.length > 0) {
                    const diasFormatados = reavaliacao.dias.map(d => d.split('-')[2]).join(', ');
                    html += `<li><strong>Reavaliação:</strong> Dias ${diasFormatados}</li>`;
                }
                
                return html;
            };

            if (docSnap.exists) {
                const data = docSnap.data();
                // ALTERADO: Acessa a estrutura de dados aninhada corretamente
                const disponibilidadeDoMes = data.disponibilidade?.[mesKey];

                if (disponibilidadeDoMes) {
                    const detalhesOnline = formatarDetalhes(disponibilidadeDoMes.online);
                    if (detalhesOnline) {
                        onlineHtml = detalhesOnline;
                    }

                    const detalhesPresencial = formatarDetalhes(disponibilidadeDoMes.presencial);
                    if (detalhesPresencial) {
                        presencialHtml = detalhesPresencial;
                    }
                }
            }
            
            // ALTERADO: Título do card agora é dinâmico com o mês atual
            summaryContainer.innerHTML = `
                <div class="summary-card">
                    <h4>🗓️ Minha Disponibilidade (${nomeMesCapitalizado})</h4>
                    <strong>Online:</strong>
                    <ul>${onlineHtml}</ul>
                    <hr style="margin: 15px 0;">
                    <strong>Presencial:</strong>
                    <ul>${presencialHtml}</ul>
                    <a href="#disponibilidade-assistente" class="card-footer-link">Clique aqui para modificar</a>
                </div>`;

        } catch (error) {
            console.error("Erro ao carregar disponibilidade:", error);
            summaryContainer.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Não foi possível carregar a disponibilidade.</div>`;
        }
    }
    // --- 2. Lógica do Card de Agendamentos ---
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

    // --- Inicialização ---
    renderDisponibilidade();
    renderAgendamentos();
}