// Arquivo: /modulos/servico-social/js/disponibilidade-assistente.js
// Descrição: Controla o formulário de disponibilidade da assistente social.

export function init(db, user, userData) {
    const form = document.getElementById('disponibilidade-form');
    const assistenteNomeInput = document.getElementById('assistente-nome');
    const horariosOnlineTextarea = document.getElementById('horarios-online');
    const horariosPresencialTextarea = document.getElementById('horarios-presencial');

    if (!form) return;

    // Preenche o nome da assistente social logada
    assistenteNomeInput.value = userData.nome || 'Não identificado';

    // Carrega a disponibilidade salva anteriormente
    async function carregarDisponibilidade() {
        const docRef = db.collection('disponibilidadeAssistentes').doc(user.uid);
        try {
            const doc = await docRef.get();
            if (doc.exists) {
                const data = doc.data();
                horariosOnlineTextarea.value = data.online || '';
                horariosPresencialTextarea.value = data.presencial || '';
            }
        } catch (error) {
            console.error("Erro ao carregar disponibilidade:", error);
            alert("Não foi possível carregar sua disponibilidade salva.");
        }
    }

    // Salva a disponibilidade no Firestore
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveButton = form.querySelector('button[type="submit"]');
        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';

        const dataToSave = {
            assistenteNome: userData.nome,
            online: horariosOnlineTextarea.value.trim(),
            presencial: horariosPresencialTextarea.value.trim(),
            atualizadoEm: new Date()
        };

        try {
            await db.collection('disponibilidadeAssistentes').doc(user.uid).set(dataToSave, { merge: true });
            alert("Disponibilidade salva com sucesso!");
        } catch (error) {
            console.error("Erro ao salvar disponibilidade:", error);
            alert("Ocorreu um erro ao salvar. Tente novamente.");
        } finally {
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar Disponibilidade';
        }
    });

    carregarDisponibilidade();
}