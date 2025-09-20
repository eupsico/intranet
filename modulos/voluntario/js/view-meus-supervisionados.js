// Arquivo: /modulos/voluntario/js/view-meus-supervisionados.js (antigo view-meus-agendamentos.js)
// Versão: 2.0 (Modernizado para Firebase v9+, ES6 Module)
// Descrição: Exibe a lista de agendamentos de supervisão para o supervisor logado.

import { db, collection, query, where, orderBy, getDocs } from '../../../assets/js/firebase-init.js';

export function init(user, userData) {
    const listaContainer = document.getElementById('lista-agendamentos-container');

    if (!listaContainer) {
        console.error("Container da lista de agendamentos não encontrado.");
        return;
    }

    /**
     * Carrega e exibe os agendamentos do supervisor logado.
     */
    async function carregarAgendamentos() {
        if (!user) {
            listaContainer.innerHTML = '<p class="alert alert-error">Você precisa estar logado para ver seus agendamentos.</p>';
            return;
        }

        listaContainer.innerHTML = '<div class="loading-spinner"></div>';

        try {
            // Query moderna para buscar agendamentos do supervisor, ordenados por data
            const agendamentosRef = collection(db, 'agendamentos');
            const q = query(
                agendamentosRef,
                where('supervisorUid', '==', user.uid),
                orderBy('dataAgendamento', 'desc')
            );
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                listaContainer.innerHTML = '<p>Nenhum agendamento encontrado para você.</p>';
                return;
            }

            listaContainer.innerHTML = ''; // Limpa o spinner

            querySnapshot.forEach(doc => {
                const agendamento = doc.data();
                
                const dataFormatada = new Date(agendamento.dataAgendamento).toLocaleString('pt-BR', {
                    dateStyle: 'long',
                    timeStyle: 'short'
                });

                const agendamentoElement = document.createElement('div');
                agendamentoElement.className = 'agendamento-item';

                agendamentoElement.innerHTML = `
                    <div>
                        <strong>Profissional:</strong><br>
                        ${agendamento.profissionalNome || 'Não informado'}
                    </div>
                    <div>
                        <strong>Email:</strong><br>
                        ${agendamento.profissionalEmail || 'Não informado'}
                    </div>
                    <div>
                        <strong>Telefone:</strong><br>
                        ${agendamento.profissionalTelefone || 'Não informado'}
                    </div>
                    <div>
                        <strong>Data da Supervisão:</strong><br>
                        ${dataFormatada}
                    </div>
                `;
                listaContainer.appendChild(agendamentoElement);
            });

        } catch (error) {
            console.error("Erro ao buscar agendamentos:", error);
            listaContainer.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao carregar seus agendamentos.</p>';
        }
    }

    carregarAgendamentos();
}