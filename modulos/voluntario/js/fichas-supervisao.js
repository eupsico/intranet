// Arquivo: /modulos/voluntario/js/fichas-supervisao.js
// Versão: 2.1 (Layout de tabela e padronização)
// Descrição: Lista as fichas de supervisão preenchidas pelo voluntário.

import { db, collection, getDocs, query, where, orderBy } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData) {
    const container = document.getElementById('lista-registros-container');
    if (!container) {
        console.error("Container da lista de registros não encontrado.");
        return;
    }

    async function carregarRegistros() {
        container.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const supervisaoRef = collection(db, 'supervisao');
            // CORREÇÃO: Ordenando pelo campo 'data' que é o campo correto para a data da ficha.
            const q = query(supervisaoRef, where('profissionalUid', '==', user.uid), orderBy('data', 'desc'));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                container.innerHTML = '<p class="info-card">Nenhuma ficha de acompanhamento encontrada para você.</p>';
                return;
            }

            // Renderização em Tabela para melhor alinhamento
            let tableHtml = `
                <table class="table-modern">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Paciente (Iniciais)</th>
                            <th>Supervisor</th>
                            <th>Ações</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            querySnapshot.forEach(doc => {
                const registro = doc.data();
                const dataFormatada = registro.data 
                    ? new Date(registro.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) 
                    : 'Não informada';

                tableHtml += `
                    <tr>
                        <td>${dataFormatada}</td>
                        <td>${registro.iniciaisPaciente || 'N/A'}</td>
                        <td>${registro.supervisorNome || 'N/A'}</td>
                        <td><a href="#ficha-supervisao/${doc.id}" class="btn btn-primary">Ver Ficha</a></td>
                    </tr>
                `;
            });

            tableHtml += '</tbody></table>';
            container.innerHTML = tableHtml;

        } catch (error) {
            console.error("Erro ao carregar registros:", error);
            container.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Ocorreu um erro ao carregar seus acompanhamentos.</div>`;
        }
    }

    carregarRegistros();
}