class user {
  constructor(email, user_type, name, senha) {
    this.email = email;
    this.user_type = user_type;
    this.name = name;
    this.senha = senha;
  }
}

module.exports = user;