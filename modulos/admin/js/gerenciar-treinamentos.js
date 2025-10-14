import { db, doc, getDoc, setDoc } from "../../../assets/js/firebase-init.js";
import { autenticarEObterDadosUsuario } from "../../../assets/js/app.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await autenticarEObterDadosUsuario();
  if (!user || !user.data.isSuperAdmin) {
    console.error("Acesso negado. O usuário não é um super administrador.");
    window.location.hash = "#login";
    return;
  }

  const tabs = document.querySelectorAll(".tab-link");
  const contents = document.querySelectorAll(".tab-content");
  const modal = document.getElementById("video-modal");
  const closeModal = document.querySelector(".close-button");
  const videoForm = document.getElementById("video-form");

  let treinamentosData = {};

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      contents.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  document.getElementById("btn-voltar").addEventListener("click", () => {
    window.location.hash = "#painel-admin";
  });

  document.querySelectorAll(".btn-add-video").forEach((button) => {
    button.addEventListener("click", (e) =>
      openModal(e.target.dataset.category)
    );
  });

  closeModal.onclick = () => (modal.style.display = "none");
  window.onclick = (event) => {
    if (event.target == modal) {
      modal.style.display = "none";
    }
  };

  videoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    await salvarVideo();
  });

  async function carregarTreinamentos() {
    try {
      const docRef = doc(db, "configuracoes", "treinamentos");
      const docSnap = await getDoc(docRef);
      treinamentosData = docSnap.exists()
        ? docSnap.data()
        : { integracao: [], geral: [], administrativo: [] };
      renderizarListasDeVideos();
    } catch (error) {
      console.error("Erro ao carregar treinamentos:", error);
    }
  }

  function renderizarListasDeVideos() {
    ["integracao", "geral", "administrativo"].forEach((category) => {
      const container = document.getElementById(`${category}-videos-list`);
      container.innerHTML = "";
      const videos = treinamentosData[category] || [];
      if (videos.length === 0) {
        container.innerHTML = "<p>Nenhum vídeo cadastrado.</p>";
        return;
      }
      videos.forEach((video, index) => {
        const item = document.createElement("div");
        item.classList.add("video-list-item");
        item.innerHTML = `
                    <div class="video-info">
                        <strong>Link:</strong> <a href="${video.link}" target="_blank">${video.link}</a>
                        <p><strong>Descrição:</strong> ${video.descricao}</p>
                    </div>
                    <div class="video-actions">
                        <button class="btn-secondary btn-edit-video" data-category="${category}" data-id="${index}">Editar</button>
                        <button class="btn-danger btn-delete-video" data-category="${category}" data-id="${index}">Excluir</button>
                    </div>
                `;
        container.appendChild(item);
      });
    });
    addEventListenersAcoes();
  }

  function addEventListenersAcoes() {
    document.querySelectorAll(".btn-edit-video").forEach((button) => {
      button.addEventListener("click", (e) => {
        const { category, id } = e.target.dataset;
        openModal(category, id);
      });
    });

    document.querySelectorAll(".btn-delete-video").forEach((button) => {
      button.addEventListener("click", async (e) => {
        if (confirm("Tem certeza que deseja excluir este vídeo?")) {
          const { category, id } = e.target.dataset;
          treinamentosData[category].splice(id, 1);
          await salvarTreinamentosNoFirebase();
          renderizarListasDeVideos();
        }
      });
    });
  }

  function openModal(category, id = null) {
    videoForm.reset();
    document.getElementById("video-category").value = category;
    const modalTitle = document.getElementById("modal-title");

    if (id !== null) {
      modalTitle.textContent = "Editar Vídeo";
      const video = treinamentosData[category][id];
      document.getElementById("video-id").value = id;
      document.getElementById("video-link").value = video.link;
      document.getElementById("video-description").value = video.descricao;
    } else {
      modalTitle.textContent = "Adicionar Vídeo";
      document.getElementById("video-id").value = "";
    }
    modal.style.display = "block";
  }

  async function salvarVideo() {
    const category = document.getElementById("video-category").value;
    const id = document.getElementById("video-id").value;
    const link = document.getElementById("video-link").value.trim();
    const descricao = document.getElementById("video-description").value.trim();

    if (!link || !descricao) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    const video = { link, descricao };

    if (id) {
      // Editando
      treinamentosData[category][id] = video;
    } else {
      // Adicionando
      if (!treinamentosData[category]) treinamentosData[category] = [];
      treinamentosData[category].push(video);
    }

    await salvarTreinamentosNoFirebase();
    renderizarListasDeVideos();
    modal.style.display = "none";
  }

  async function salvarTreinamentosNoFirebase() {
    try {
      const docRef = doc(db, "configuracoes", "treinamentos");
      await setDoc(docRef, treinamentosData);
      console.log("Treinamentos salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar treinamentos:", error);
      alert("Ocorreu um erro ao salvar os dados.");
    }
  }

  await carregarTreinamentos();
});
