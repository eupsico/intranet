import { db, doc, getDoc } from "../../../assets/js/firebase-init.js";

// A função é exportada e recebe os dados do usuário, seguindo o padrão do painel
export function init(db, user, userData) {
  // A verificação de permissão usa os dados já recebidos
  if (
    !userData ||
    !(
      userData.funcoes &&
      userData.funcoes.some((role) =>
        ["admin", "gestor", "assistente"].includes(role)
      )
    )
  ) {
    console.error("Acesso negado. O usuário não tem a permissão necessária.");
    const container = document.querySelector(".container");
    if (container)
      container.innerHTML =
        "<h2>Acesso Negado</h2><p>Você não tem permissão para ver esta página.</p>";
    return;
  }

  console.log("📚 Módulo de Treinamentos (Visualização) iniciado.");

  // Lógica de abas e botão voltar foi removida

  async function carregarTreinamentos() {
    const container = document.getElementById("videos-container");
    if (!container) return;

    container.innerHTML = '<div class="loading-spinner"></div>'; // Mostra carregando

    try {
      const docRef = doc(db, "configuracoesSistema", "treinamentos");
      const docSnap = await getDoc(docRef);

      let todosOsVideos = [];
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Junta todos os vídeos de todas as categorias em um único array
        todosOsVideos = [
          ...(data.integracao || []),
          ...(data.geral || []),
          ...(data.administrativo || []),
        ];
      }

      renderizarVideos(todosOsVideos);
    } catch (error) {
      console.error("Erro ao carregar treinamentos:", error);
      container.innerHTML = "<p>Ocorreu um erro ao carregar os vídeos.</p>";
    }
  }

  function renderizarVideos(videos) {
    const container = document.getElementById("videos-container");
    container.innerHTML = ""; // Limpa o spinner

    if (videos.length === 0) {
      container.innerHTML =
        "<p>Nenhum vídeo de treinamento cadastrado no momento.</p>";
      return;
    }

    videos.forEach((video) => {
      const videoId = extrairVideoId(video.link);
      if (videoId) {
        const videoElement = document.createElement("div");
        videoElement.classList.add("video-item");
        // Adicionado o Título (h3) ao HTML
        videoElement.innerHTML = `
            <h3>${video.title || "Vídeo sem Título"}</h3>
            <div class="video-embed">
                <iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
            </div>
            <div class="video-description">
                <p>${video.descricao.replace(/\n/g, "<br>")}</p>
            </div>
          `;
        container.appendChild(videoElement);
      }
    });
  }

  function extrairVideoId(url) {
    if (!url) return null;
    const regex =
      /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const matches = url.match(regex);
    return matches ? matches[1] : null;
  }

  carregarTreinamentos();
}
