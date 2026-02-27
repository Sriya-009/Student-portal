const users = [
  { id: 1, name: 'Admin User', email: 'admin@school.com', password: 'admin123', role: 'admin' },
  { id: 2, name: 'Teacher User', email: 'teacher@school.com', password: 'teacher123', role: 'teacher' },
  { id: 3, name: 'Student User', email: 'student@school.com', password: 'student123', role: 'student' }
];

export function loginUser(email, password) {
  const user = users.find((item) => item.email === email && item.password === password);
  if (!user) {
    throw new Error('Invalid email or password');
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

export function signupUser(name, email, password, role = 'student') {
  const alreadyExists = users.some((item) => item.email === email);

  if (alreadyExists) {
    throw new Error('User already exists with this email');
  }

  const newUser = {
    id: users.length + 1,
    name,
    email,
    password,
    role
  };

  users.push(newUser);

  return {
    id: newUser.id,
    name: newUser.name,
    email: newUser.email,
    role: newUser.role
  };
}
