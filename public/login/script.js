document.querySelector('.login-form').addEventListener('submit', async (e) => {
  e.preventDefault(); 
  await login(); 
});

async function login() {
  const data = {
    email: document.getElementById('email').value,
    senha: document.getElementById('pass').value,
  };

  try {
    const response = await fetch('http://localhost:3000/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      console.log('Erro ao autenticar credenciais');
      return;
    }

    window.location.href = 'http://localhost:3000/home/';
  } catch (error) {
    toast.warning(`Erro: ${error.message || error}`);
  }
}
