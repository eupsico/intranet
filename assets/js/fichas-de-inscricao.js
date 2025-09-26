// Arquivo: /assets/js/fichas-de-inscricao.js
// Versão 1.1: Corrigido para importar 'db' como um módulo.

// ALTERADO: Importa a variável 'db' do firebase-init.js
import { db } from './firebase-init.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('inscricao-form');
    const cpfInput = document.getElementById('cpf');
    const dataNascimentoInput = document.getElementById('data-nascimento');
    const formBody = document.getElementById('form-body');
    const updateSection = document.getElementById('update-section');
    const newRegisterSection = document.getElementById('new-register-section');
    const fullFormFields = document.getElementById('full-form-fields');
    const responsavelSection = document.getElementById('responsavel-legal-section');
    const responsavelCpfInput = document.getElementById('responsavel-cpf');
    const horariosContainer = document.getElementById('horarios-especificos-container');
    
    let pacienteExistente = null;

    // --- 1. Lógica de Verificação de CPF ---
    cpfInput.addEventListener('blur', async () => {
        const cpf = cpfInput.value.replace(/\D/g, '');
        if (cpf.length !== 11) {
            resetForm();
            return;
        }

        try {
            const snapshot = await db.collection('inscricoes').where('cpf', '==', cpf).limit(1).get();
            
            if (!snapshot.empty) {
                pacienteExistente = snapshot.docs[0].data();
                const nome = pacienteExistente.nomeCompleto || 'Nome não encontrado';
                if (confirm(`Já existe um cadastro para ${nome}. Deseja atualizar as informações?`)) {
                    formBody.classList.remove('hidden-section');
                    updateSection.classList.remove('hidden-section');
                    newRegisterSection.classList.add('hidden-section');
                } else {
                    resetForm(true);
                }
            } else {
                pacienteExistente = null;
                formBody.classList.remove('hidden-section');
                updateSection.classList.add('hidden-section');
                newRegisterSection.classList.remove('hidden-section');
            }
        } catch (error) {
            console.error("Erro ao verificar CPF:", error);
            alert("Não foi possível verificar o CPF. Tente novamente.");
        }
    });

    // --- 2. Lógica de Menor de Idade ---
    dataNascimentoInput.addEventListener('change', () => {
        const dataNasc = new Date(dataNascimentoInput.value);
        if (isNaN(dataNasc.getTime())) return;

        const hoje = new Date();
        let idade = hoje.getFullYear() - dataNasc.getFullYear();
        const m = hoje.getMonth() - dataNasc.getMonth();
        if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
            idade--;
        }
        
        fullFormFields.classList.remove('hidden-section');
        if (idade < 18) {
            responsavelSection.classList.remove('hidden-section');
        } else {
            responsavelSection.classList.add('hidden-section');
        }
    });

    responsavelCpfInput.addEventListener('blur', () => {
        if (responsavelCpfInput.value === cpfInput.value) {
            alert("Atenção: O CPF do responsável é o mesmo do paciente. Será necessário atualizar o CPF do paciente no futuro.");
            const tempId = `TEMP-${Date.now()}`;
            cpfInput.value = tempId;
            alert(`O CPF do paciente foi substituído por um código de identificação temporário: ${tempId}. Guarde este código.`);
        }
    });

    // --- 3. Lógica de Disponibilidade de Horário ---
    const horariosCheckboxes = document.querySelectorAll('input[name="horario"]');
    horariosCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const periodo = e.target.value;
            const container = document.getElementById(`container-${periodo}`);
            if (e.target.checked) {
                gerarHorarios(periodo, container);
                container.classList.remove('hidden-section');
            } else {
                container.innerHTML = '';
                container.classList.add('hidden-section');
            }
        });
    });

    function gerarHorarios(periodo, container) {
        let horarios = [];
        let label = '';

        switch(periodo) {
            case 'manha-semana':
                label = 'Selecione os horários na Manhã (Seg-Sex):';
                for(let i = 8; i < 12; i++) horarios.push(`${i}:00`);
                break;
            case 'tarde-semana':
                label = 'Selecione os horários na Tarde (Seg-Sex):';
                for(let i = 12; i < 18; i++) horarios.push(`${i}:00`);
                break;
            case 'noite-semana':
                label = 'Selecione os horários na Noite (Seg-Sex):';
                for(let i = 18; i < 21; i++) horarios.push(`${i}:00`);
                break;
            case 'manha-sabado':
                label = 'Selecione os horários na Manhã (Sábado):';
                for(let i = 8; i < 13; i++) horarios.push(`${i}:00`);
                break;
        }

        let html = `<label>${label}</label><div class="horario-detalhe-grid">`;
        horarios.forEach(hora => {
            html += `<div><input type="checkbox" name="horario-especifico" value="${periodo}_${hora}"> ${hora}</div>`;
        });
        html += `</div>`;
        container.innerHTML = html;
    }

    function resetForm(keepCpf = false) {
        form.reset();
        formBody.classList.add('hidden-section');
        updateSection.classList.add('hidden-section');
        newRegisterSection.classList.remove('hidden-section');
        fullFormFields.classList.add('hidden-section');
        responsavelSection.classList.add('hidden-section');
        horariosContainer.querySelectorAll('.horario-detalhe-container').forEach(c => {
            c.innerHTML = '';
            c.classList.add('hidden-section');
        });
        if (!keepCpf) {
            cpfInput.value = '';
        }
    }
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        alert("Lógica de envio a ser implementada!");
    });
});