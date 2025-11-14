// In-memory database
// Password untuk kedua user di bawah ini adalah: "password123"
let users = [
  {
    id: 'admin-user-01',
    name: 'Admin Aska',
    email: 'admin@email.com',
    // Hash untuk "password123"
    password: '$2a$10$f.w1.1u.G3zmlzJz.F.3OOiT211j/lIq.aJc.4v.jYy.gGq.w/WqG',
    teamId: 'team-1', // Admin sudah ada di team-1
    role: 'admin',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'normal-user-02',
    name: 'User Biasa',
    email: 'user@email.com',
    // Hash untuk "password123"
    password: '$2a$10$f.w1.1u.G3zmlzJz.F.3OOiT211j/lIq.aJc.4v.jYy.gGq.w/WqG',
    teamId: 'team-1', // User ini juga sudah ada di team-1
    role: 'user',
    createdAt: new Date().toISOString(),
  }
];

let teams = [
  {
    id: 'team-1',
    name: 'Development Team',
    createdAt: new Date().toISOString()
  }
];

module.exports = {
  users,
  teams
};