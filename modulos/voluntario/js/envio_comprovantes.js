// Arquivo: /modulos/voluntario/js/envio_comprovantes.js
// Versão: 3.0 (Modernizado para Firebase v9+ e ES6+)
// Descrição: Controla o envio de comprovantes, utilizando Google Apps Script para upload e Firestore para registro.

import { db, collection, query, where, orderBy, getDocs, addDoc, serverTimestamp } from '../../../assets/js/firebase-init.js';

export function init(user, userData) {
    if (!db) {
        console.error("Instância do Firestore (db) não encontrada.");
        return;
    }
    
    // URL do Google Apps Script para o upload de arquivos
    const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzOGyDANVS--DeH6T-ZaqFiEmhpBYUJu4P8VT0uevQPwC3tLL5EgappHPI2mhKwPtf1fg/exec";
    
    let formData = {};

    // Mapeamento dos elementos do DOM
    const formContainer = document.getElementById('form-container');
    const confirmationSection = document.getElementById('confirmation-section');
    const finalMessageSection = document.getElementById('final-message-section');
    const messageContainer = document.getElementById('message-container');
    const form = document.getElementById('comprovante-form');
    const selectProfissional = document.getElementById('form-profissional');
    const selectMes = document.getElementById('form-mes-ref');

    /**
     * Inicializa a view, populando os seletores de profissional e mês.
     */
    async function initializeView() {
        try {
            const usuariosRef = collection(db, 'usuarios');
            const q = query(
                usuariosRef,
                where('inativo', '==', false),
                where('recebeDireto', '==', true),
                where('fazAtendimento', '==', true),
                orderBy('nome')
            );
            
            const snapshot = await getDocs(q);
            const profissionais = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
            
            const optionsHtml = ['<option value="">Selecione seu nome...</option>', ...profissionais.map(p => `<option value="${p.nome}">${p.nome}</option>`)].join('');
            selectProfissional.innerHTML = optionsHtml;

            // Pré-seleciona o usuário logado
            if (userData?.nome) {
                selectProfissional.value = userData.nome;
            }

        } catch (error) {
            console.error("Erro ao buscar profissionais:", error);
            selectProfissional.innerHTML = '<option value="">Erro ao carregar</option>';
        }
        
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const mesOptions = meses.map(m => `<option value="${m}">${m}</option>`).join('');
        selectMes.innerHTML = mesOptions;
        
        const today = new Date();
        selectMes.value = meses[today.getMonth()];
        document.getElementById('form-data-pagamento').value = today.toISOString().split('T')[0];
    }
    
    function showMessage(message, type = 'error') {
        messageContainer.textContent = message;
        messageContainer.className = `alert alert-${type}`;
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

        const profissionalNome = selectProfissional.value;
        const paciente = document.getElementById('form-paciente').value;
        const dataPagamento = new Date(document.getElementById('form-data-pagamento').value + 'T00:00:00').toLocaleDateString('pt-BR');
        const mesReferencia = selectMes.value;
        const valor = parseFloat(document.getElementById('form-valor').value);
        const file = document.getElementById('form-arquivo').files[0];
        
        formData = { 
            profissional: profissionalNome, 
            paciente, 
            dataPagamentoOriginal: document.getElementById('form-data-pagamento').value, 
            mesReferencia, valor, file 
        };
        
        document.getElementById('confirm-profissional').textContent = profissionalNome;
        document.getElementById('confirm-paciente').textContent = paciente;
        document.getElementById('confirm-data').textContent = dataPagamento;
        document.getElementById('confirm-mes').textContent = mesReferencia;
        document.getElementById('confirm-valor').textContent = valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        document.getElementById('confirm-arquivo').textContent = file.name;
        
        formContainer.style.display = 'none';
        confirmationSection.style.display = 'block';
    });

    document.getElementById('btn-edit').addEventListener('click', () => {
        formContainer.style.display = 'block';
        confirmationSection.style.display = 'none';
    });
    
    document.getElementById('btn-confirm-send').addEventListener('click', () => {
        const saveBtn = document.getElementById('btn-confirm-send');
        saveBtn.disabled = true;
        saveBtn.textContent = 'Enviando...';
        
        const reader = new FileReader();
        reader.readAsDataURL(formData.file);

        reader.onload = function() {
            const fileData = reader.result.split(',')[1];
            const payload = {
                profissional: formData.profissional,
                paciente: formData.paciente,
                dataPagamento: formData.dataPagamentoOriginal,
                mesReferencia: formData.mesReferencia,
                valor: formData.valor,
                fileName: formData.file.name,
                mimeType: formData.file.type,
                fileData: fileData
            };
            
            fetch(WEB_APP_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(async response => {
                if (response.status === 'success') {
                    const comprovanteData = {
                        profissional: payload.profissional,
                        paciente: payload.paciente,
                        valor: payload.valor,
                        dataPagamento: payload.dataPagamento,
                        mesReferencia: payload.mesReferencia.toLowerCase(),
                        anoReferencia: new Date(payload.dataPagamento + 'T00:00:00').getFullYear(),
                        comprovanteUrl: response.fileUrl,
                        status: 'Pendente',
                        timestamp: serverTimestamp()
                    };
                    await addDoc(collection(db, 'comprovantes'), comprovanteData);
                    return payload;
                } else {
                    throw new Error(response.message);
                }
            })
            .then(payload => {
                confirmationSection.style.display = 'none';
                const summaryHtml = `
                    <p><strong>Profissional:</strong> <span>${payload.profissional}</span></p>
                    <p><strong>Paciente:</strong> <span>${payload.paciente}</span></p>
                    <p><strong>Data:</strong> <span>${new Date(payload.dataPagamento + 'T00:00:00').toLocaleDateString('pt-BR')}</span></p>
                    <p><strong>Valor:</strong> <span>${payload.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></p>`;
                document.getElementById('sent-data-summary').innerHTML = summaryHtml;
                finalMessageSection.style.display = 'block';
                form.reset();
            })
            .catch(error => {
                console.error('Erro no processo de envio:', error);
                showMessage(`Ocorreu um erro grave no envio: ${error.message}`, 'error');
                formContainer.style.display = 'block';
                confirmationSection.style.display = 'none';
            })
            .finally(() => {
                saveBtn.disabled = false;
                saveBtn.textContent = 'Confirmar e Enviar';
            });
        };
        
        reader.onerror = (error) => {
            console.error('Erro ao ler o arquivo:', error);
            showMessage('Não foi possível ler o arquivo anexado.', 'error');
            saveBtn.disabled = false;
            saveBtn.textContent = 'Confirmar e Enviar';
        };
    });

    document.getElementById('btn-new-form').addEventListener('click', () => {
        finalMessageSection.style.display = 'none';
        formContainer.style.display = 'block';
        hideMessage();
        initializeView();
    });

    initializeView();
}