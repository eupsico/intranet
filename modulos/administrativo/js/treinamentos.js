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

  // O restante do código é executado dentro da função 'init'
  const tabs = document.querySelectorAll(".tab-link");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((item) => item.classList.remove("active"));
      contents.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });

  document.getElementById("btn-voltar").addEventListener("click", () => {
    window.location.hash = "#grade"; // Volta para a view padrão do painel
  });

  async function carregarTreinamentos() {
    try {
      // Caminho corrigido para o documento no Firestore
      const docRef = doc(db, "configuracoesSistema", "treinamentos");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        renderizarVideos("integracao", data.integracao || []);
        renderizarVideos("geral", data.geral || []);
        renderizarVideos("administrativo", data.administrativo || []);
      } else {
        console.log("Nenhum documento de treinamentos encontrado!");
        // Exibe mensagem em todas as abas
        renderizarVideos("integracao", []);
        renderizarVideos("geral", []);
        renderizarVideos("administrativo", []);
      }
    } catch (error) {
      console.error("Erro ao carregar treinamentos:", error);
    }
  }

  function renderizarVideos(categoria, videos) {
    const container = document.getElementById(`${categoria}-videos`);
    if (!container) return;
    container.innerHTML = "";

    if (videos.length === 0) {
      container.innerHTML =
        "<p>Nenhum vídeo cadastrado para esta categoria.</p>";
      return;
    }

    videos.forEach((video) => {
      const videoId = extrairVideoId(video.link);
      if (videoId) {
        const videoElement = document.createElement("div");
        videoElement.classList.add("video-item");
        videoElement.innerHTML = `
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
