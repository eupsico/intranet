// Arquivo: /modulos/servico-social/js/dashboard-servico-social.js
// Versão: 1.2 (Sintaxe do Firebase v9 corrigida)

export function init(db, user, userData) {
    const summaryContainer = document.getElementById('summary-panel-container');
    const agendamentosContainer = document.getElementById('agendamentos-card-container');

    if (!summaryContainer || !agendamentosContainer) return;

    // --- 1. Lógica do Card de Disponibilidade ---
    async function renderDisponibilidade() {
        try {
            const docRef = db.collection('disponibilidadeAssistentes').doc(user.uid);
            const docSnap = await docRef.get();
            let onlineHtml = '<li>Nenhum horário online informado.</li>';
            let presencialHtml = '<li>Nenhum horário presencial informado.</li>';

            // A verificação correta para a v9 é com parênteses: .exists()
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.online) {
                    onlineHtml = data.online.split('\n').map(item => `<li>${item}</li>`).join('');
                }
                if (data.presencial) {
                    presencialHtml = data.presencial.split('\n').map(item => `<li>${item}</li>`).join('');
                }
            }
            
            summaryContainer.innerHTML = `
                <div class="summary-card">
                    <h4>🗓️ Minha Disponibilidade</h4>
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