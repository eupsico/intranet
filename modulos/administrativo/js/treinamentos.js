import { db, doc, getDoc } from "../../../assets/js/firebase-init.js";
import { autenticarEObterDadosUsuario } from "../../../assets/js/app.js";

document.addEventListener("DOMContentLoaded", async () => {
  const user = await autenticarEObterDadosUsuario();
  // Valida se o usuário tem a permissão 'isAdministrativo'
  if (!user || !user.data.isAdministrativo) {
    console.error(
      "Acesso negado. O usuário não tem permissão de administrativo."
    );
    window.location.hash = "#login";
    return;
  }

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

  // Botão 'Voltar' agora aponta para o painel administrativo
  document.getElementById("btn-voltar").addEventListener("click", () => {
    window.location.hash = "#administrativo-painel";
  });

  await carregarTreinamentos();
});

async function carregarTreinamentos() {
  try {
    const docRef = doc(db, "configuracoes", "treinamentos");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      renderizarVideos("integracao", data.integracao || []);
      renderizarVideos("geral", data.geral || []);
      renderizarVideos("administrativo", data.administrativo || []);
    } else {
      console.log("Nenhum documento de treinamentos encontrado!");
    }
  } catch (error) {
    console.error("Erro ao carregar treinamentos:", error);
  }
}

function renderizarVideos(categoria, videos) {
  const container = document.getElementById(`${categoria}-videos`);
  container.innerHTML = "";

  if (videos.length === 0) {
    container.innerHTML = "<p>Nenhum vídeo cadastrado para esta categoria.</p>";
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
