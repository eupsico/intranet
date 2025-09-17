// Arquivo: /modulos/voluntario/js/envio_comprovantes.js
// Versão: 2.0
// Descrição: Refatorado para o padrão de módulo da intranet, usando Firebase Storage para upload.

export function init(db, user, userData, storage) {
    if (!db || !storage) {
        console.error("Instância do Firestore (db) ou do Storage não encontrada.");
        return;
    }
    
    let formData = {};

    const formContainer = document.getElementById('form-container');
    const confirmationSection = document.getElementById('confirmation-section');
    const finalMessageSection = document.getElementById('final-message-section');
    const messageContainer = document.getElementById('message-container');
    const form = document.getElementById('comprovante-form');
    const selectProfissional = document.getElementById('form-profissional');
    const selectMes = document.getElementById('form-mes-ref');

    async function initializeView() {
        try {
            const snapshot = await db.collection('usuarios')
                .where('inativo', '==', false)
                .where('recebeDireto', '==', true)
                .where('fazAtendimento', '==', true)
                .orderBy('nome')
                .get();
            
            const profissionais = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            
            const optionsHtml = ['<option value="">Selecione seu nome...</option>', ...profissionais.map(p => `<option value="${p.uid}">${p.nome}</option>`)].join('');
            selectProfissional.innerHTML = optionsHtml;

            // Pré-seleciona o usuário logado
            if (user && user.uid) {
                selectProfissional.value = user.uid;
            }

        } catch (error) {
            console.error("Erro ao buscar profissionais:", error);
            selectProfissional.innerHTML = '<option value="">Erro ao carregar</option>';
        }
        
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const mesOptions = meses.map(m => `<option value="${m.toLowerCase()}">${m}</option>`).join('');
        selectMes.innerHTML = mesOptions;
        
        const today = new Date();
        selectMes.value = meses[today.getMonth()].toLowerCase();
        document.getElementById('form-data-pagamento').value = today.toISOString().split('T')[0];
    }
    
    function showMessage(message, type = 'error') {
        messageContainer.textContent = message;
        messageContainer.className = type; // A classe já vem formatada (p.e. 'error' ou 'success')
        messageContainer.style.display = 'block';
    }

    function hideMessage() {
        messageContainer.style.display = 'none';
    }
    
    function validateForm() {
        const fields = {
            profissional: { value: selectProfissional.value, name: 'Seu Nome' },
            paciente: { value: document.getElementById('form-paciente').value.trim(), name: 'Nome do Paciente' },
            dataPagamento: { value: document.getElementById('form-data-pagamento').value, name: 'Data do Pagamento' },
            valor: { value: document.getElementById('form-valor').value, name: 'Valor da Contribuição' },
            file: { value: document.getElementById('form-arquivo').files.length, name: 'Anexo do Comprovante' }
        };

        for (const key in fields) {
            if (!fields[key].value) {
                showMessage(`O campo '${fields[key].name}' é obrigatório.`, 'error');
                return false;
            }
        }
        if (isNaN(parseFloat(fields.valor.value)) || parseFloat(fields.valor.value) <= 0) {
            showMessage(`O valor informado no campo '${fields.valor.name}' não é válido.`, 'error');
            return false;
        }
        hideMessage();
        return true;
    }

    document.getElementById('btn-review').addEventListener('click', () => {
        if (!validateForm()) return;

        const profissionalNome = selectProfissional.options[selectProfissional.selectedIndex].text;
        const profissionalId = selectProfissional.value;
        const paciente = document.getElementById('form-paciente').value;
        const dataPagamento = new Date(document.getElementById('form-data-pagamento').value + 'T00:00:00').toLocaleDateString('pt-BR');
        const mesReferencia = selectMes.value;
        const valor = parseFloat(document.getElementById('form-valor').value);
        const file = document.getElementById('form-arquivo').files[0];
        
        formData = { 
            profissionalNome, profissionalId, paciente, 
            dataPagamentoOriginal: document.getElementById('form-data-pagamento').value, 
            mesReferencia, valor, file 
        };
        
        document.getElementById('confirm-profissional').textContent = profissionalNome;
        document.getElementById('confirm-paciente').textContent = paciente;
        document.getElementById('confirm-data').textContent = dataPagamento;
        document.getElementById('confirm-mes').textContent = mesReferencia.charAt(0).toUpperCase() + mesReferencia.slice(1);
        document.getElementById('confirm-valor').textContent = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('confirm-arquivo').textContent = file.name;
        
        formContainer.style.display = 'none';
        confirmationSection.style.display = 'block';
    });

    document.getElementById('btn-edit').addEventListener('click', () => {
        formContainer.style.display = 'block';
        confirmationSection.style.display = 'none';
    });
    
    document.getElementById('btn-confirm-send').addEventListener('click', async () => {
        const saveBtn = document.getElementById('btn-confirm-send');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Enviando...';

        try {
            // 1. Fazer upload do arquivo para o Firebase Storage
            const filePath = `comprovantes/${new Date().getFullYear()}/${formData.profissionalNome}_${Date.now()}_${formData.file.name}`;
            const fileRef = storage.ref(filePath);
            const uploadTask = await fileRef.put(formData.file);
            const downloadURL = await uploadTask.ref.getDownloadURL();

            // 2. Salvar as informações no Firestore
            const comprovanteData = {
                profissional: formData.profissionalNome,
                profissionalId: formData.profissionalId,
                paciente: formData.paciente,
                valor: formData.valor,
                dataPagamento: formData.dataPagamentoOriginal,
                mesReferencia: formData.mesReferencia,
                anoReferencia: new Date(formData.dataPagamentoOriginal).getFullYear(),
                comprovanteUrl: downloadURL,
                status: 'Pendente',
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            await db.collection('comprovantes').add(comprovanteData);

            // 3. Mostrar tela de sucesso
            confirmationSection.style.display = 'none';
            const summaryHtml = `
                <p><strong>Profissional:</strong> <span>${comprovanteData.profissional}</span></p>
                <p><strong>Paciente:</strong> <span>${comprovanteData.paciente}</span></p>
                <p><strong>Data:</strong> <span>${new Date(comprovanteData.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span></p>
                <p><strong>Valor:</strong> <span>${comprovanteData.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>`;
            document.getElementById('sent-data-summary').innerHTML = summaryHtml;
            finalMessageSection.style.display = 'block';
            form.reset();
            initializeView(); // Reinicializa os selects para os valores padrão

        } catch (error) {
            console.error('Erro no envio:', error);
            showMessage('Ocorreu um erro grave no envio: ' + error.message, 'error');
            formContainer.style.display = 'block';
            confirmationSection.style.display = 'none';
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Confirmar e Enviar';
        }
    });

    document.getElementById('btn-new-form').addEventListener('click', () => {
        finalMessageSection.style.display = 'none';
        formContainer.style.display = 'block';
        hideMessage();
    });

    initializeView();
}