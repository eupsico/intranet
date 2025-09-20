// Arquivo: /modulos/voluntario/js/view-meus-agendamentos.js (Novo)
// Versão: 1.0
// Descrição: Exibe a lista de agendamentos de supervisão para o supervisor logado.

import { db, collection, query, where, orderBy, getDocs } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData) {
    const listaContainer = document.getElementById('lista-agendamentos-container');

    if (!listaContainer) {
        console.error("Container da lista de agendamentos não encontrado.");
        return;
    }

    async function carregarAgendamentos() {
        if (!user) {
            listaContainer.innerHTML = '<p class="info-card">Você precisa estar logado para ver seus agendamentos.</p>';
            return;
        }

        listaContainer.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const agendamentosRef = collection(db, 'agendamentos');
            const q = query(
                agendamentosRef,
                where('supervisorUid', '==', user.uid),
                orderBy('dataAgendamento', 'desc')
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                listaContainer.innerHTML = '<p class="info-card">Nenhum agendamento encontrado para você.</p>';
                return;
            }

            listaContainer.innerHTML = ''; // Limpa o spinner

            const list = document.createElement('div');
            list.className = 'info-card-grid';
            
            querySnapshot.forEach(doc => {
                const agendamento = doc.data();
                const dataFormatada = new Date(agendamento.dataAgendamento).toLocaleString('pt-BR', {
                    dateStyle: 'long',
                    timeStyle: 'short'
                });

                const agendamentoElement = document.createElement('div');
                agendamentoElement.className = 'info-card';
                agendamentoElement.innerHTML = `
                    <h3>${agendamento.profissionalNome || 'Profissional não informado'}</h3>
                    <ul>
                        <li><strong>Email:</strong> ${agendamento.profissionalEmail || 'Não informado'}</li>
                        <li><strong>Telefone:</strong> ${agendamento.profissionalTelefone || 'Não informado'}</li>
                        <li><strong>Data da Supervisão:</strong> ${dataFormatada}</li>
                    </ul>
                `;
                list.appendChild(agendamentoElement);
            });
            listaContainer.appendChild(list);

        } catch (error) {
            console.error("Erro ao buscar agendamentos:", error);
            listaContainer.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Ocorreu um erro ao carregar seus agendamentos.</div>`;
        }
    }

    carregarAgendamentos();
}