import { collection, getDocs, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";

export function init(db, user, userData) {
    const container = document.getElementById('lista-registros-container');
    if (!container) return;

    async function carregarRegistros() {
        container.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const supervisaoRef = collection(db, 'supervisao');
            const q = query(supervisaoRef, where('psicologoUid', '==', user.uid), orderBy('supervisaoData', 'desc'));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                container.innerHTML = '<p>Nenhuma ficha de acompanhamento encontrada para você.</p>';
                return;
            }

            let registrosHtml = '<div class="registros-list">';
            querySnapshot.forEach(doc => {
                const registro = doc.data();
                const dataFormatada = registro.supervisaoData 
                    ? new Date(registro.supervisaoData + 'T00:00:00').toLocaleDateString('pt-BR') 
                    : 'Não informada';

                registrosHtml += `
                    <a href="#ficha-supervisao/${doc.id}" class="registro-item">
                        <div><strong>Paciente:</strong> ${registro.pacienteIniciais || 'N/A'}</div>
                        <div><strong>Supervisor:</strong> ${registro.supervisorNome || 'N/A'}</div>
                        <div><strong>Data:</strong> ${dataFormatada}</div>
                    </a>
                `;
            });
            registrosHtml += '</div>';
            container.innerHTML = registrosHtml;

        } catch (error) {
            console.error("Erro ao carregar registros:", error);
            container.innerHTML = '<p class="alert alert-error">Ocorreu um erro ao carregar seus acompanhamentos.</p>';
        }
    }

    carregarRegistros();
}