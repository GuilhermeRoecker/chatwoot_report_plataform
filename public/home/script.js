async function verificarAcesso() {
  let usuario;

  try {
    const res = await fetch('/auth/me', {
      credentials: 'include'
    });

    console.log('📨 Status da resposta:', res.status);

    const dados = await res.json();

    if (!res.ok) {
      throw new Error('Usuário não autenticado');
    }

    usuario = dados;
  } catch (e) {
    window.location.href = '/login';
    return false;
  }

  return true;
}

function logout() {
  console.log('🚪 Tentando fazer logout...');
  fetch('/auth/logout', { method: 'POST', credentials: 'include' })
    .then((res) => {
      location.reload();
    })
    .catch((err) => {
      location.reload();
    });
}

window.addEventListener("DOMContentLoaded", async () => {
  const acessoPermitido = await verificarAcesso();
  if (!acessoPermitido) return;
});


document.getElementById("btn-buscar").addEventListener("click", async () => {
    const cidade = document.getElementById("cidade").value;
    const usuario = document.getElementById("usuario").value;
    const dataInicio = document.getElementById("data-inicio").value;
    const dataFim = document.getElementById("data-fim").value;

const queryParams = new URLSearchParams();
    if (cidade) queryParams.append("cidade", cidade);
    if (usuario) queryParams.append("usuario", usuario);
    if (dataInicio && dataFim) {
        queryParams.append("dataInicio", dataInicio);
        queryParams.append("dataFim", dataFim);
    }

    if (!cidade && !usuario && !(dataInicio && dataFim)) {
        alert("Preencha ao menos um filtro.");
        return;
    }

    const response = await fetch(`http://localhost:3000/relatorio?${queryParams.toString()}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        },
    });
    const resultados = await response.json();
    exibirConversas(resultados);
});


function exibirConversas(mensagens) {
    const conversasAgrupadas = {};

    mensagens.forEach(msg => {
        if (!conversasAgrupadas[msg.conversation_id]) {
            conversasAgrupadas[msg.conversation_id] = [];
        }
        conversasAgrupadas[msg.conversation_id].push(msg);
    });

    const listaConversas = document.getElementById("lista-conversas");
    const qtdConversas = Object.keys(conversasAgrupadas).length;

    document.getElementById("quantidade-conversas").innerText = `Conversas encontradas: ${qtdConversas}`;
    listaConversas.innerHTML = "";

    for (const [conversation_id, mensagens] of Object.entries(conversasAgrupadas)) {
        const primeiraMensagem = mensagens[0];

        const li = document.createElement("li");
        li.innerText = `${formatarData(primeiraMensagem.created_at)} - ${primeiraMensagem.sender_name}`;
        li.style.cursor = "pointer";
        li.addEventListener("click", () => {
            mostrarChat(conversation_id, conversasAgrupadas[conversation_id]);
        });

        listaConversas.appendChild(li);
    }
}

function formatarData(dataStr) {
    const data = new Date(dataStr);
    return data.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function mostrarChat(conversationId, mensagens) {
    const chat = document.getElementById("chat");
    chat.innerHTML = "";

    mensagens.forEach(msg => {
        const div = document.createElement("div");
        div.classList.add("mensagem");

        if (msg.private === true) {
            div.style.backgroundColor = "rgb(89, 74, 5)";
        }

        if (msg.sender_type === null && msg.message_type === 2) {
            div.classList.add("mensagem-sistema");
            div.textContent = msg.processed_message_content;

        } else {
            if (msg.sender_type === "Contact") {
                div.classList.add("mensagem-cliente");
            } else {
                div.classList.add("mensagem-suporte");
            }

            const nome = document.createElement("strong");
            nome.textContent = `${msg.sender_name}: `;

            const conteudo = document.createElement("span");
            conteudo.textContent = msg.processed_message_content;

            const data = document.createElement("div");
            data.classList.add("mensagem-data");
            data.textContent = formatarData(msg.created_at);

            div.appendChild(nome);
            div.appendChild(conteudo);
            div.appendChild(data);
        }

        chat.appendChild(div);
    });

    chat.scrollTop = chat.scrollHeight;
}

document.querySelector(".icon-logoff").addEventListener("click", logout);
