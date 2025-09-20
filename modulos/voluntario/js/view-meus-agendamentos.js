// Arquivo: /modulos/voluntario/js/view-meus-agendamentos.js
// Versão: 1.1 (Adaptado para a nova estrutura de abas)
// Descrição: Exibe a lista de agendamentos para o supervisor logado.

import { db, collection, query, where, orderBy, getDocs } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData) {
    const container = document.getElementById('meus-agendamentos');
    if (!container) return;

    async function carregarAgendamentos() {
        container.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const agendamentosRef = collection(db, 'agendamentos');
            const q = query(
                agendamentosRef,
                where('supervisorUid', '==', user.uid),
                orderBy('dataAgendamento', 'desc')
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                container.innerHTML = '<p class="info-card">Nenhum agendamento encontrado para você.</p>';
                return;
            }

            let gridHtml = '<div class="modules-grid">';
            querySnapshot.forEach(doc => {
                const agendamento = doc.data();
                const dataFormatada = new Date(agendamento.dataAgendamento).toLocaleString('pt-BR', {
                    dateStyle: 'long', timeStyle: 'short'
                });
                gridHtml += `
                    <div class="module-card">
                        <div class="card-content">
                            <h3>${agendamento.profissionalNome || 'Profissional não informado'}</h3>
                            <p><strong>Email:</strong> ${agendamento.profissionalEmail || 'N/A'}</p>
                            <p><strong>Telefone:</strong> ${agendamento.profissionalTelefone || 'N/A'}</p>
                            <p><strong>Data:</strong> ${dataFormatada}</p>
                        </div>
                    </div>
                `;
            });
            gridHtml += '</div>';
            container.innerHTML = gridHtml;

        } catch (error) {
            console.error("Erro ao buscar agendamentos:", error);
            container.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Ocorreu um erro ao carregar seus agendamentos.</div>`;
        }
    }

    carregarAgendamentos();
}