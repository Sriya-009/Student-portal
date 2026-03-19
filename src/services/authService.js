import { studentCredentials, students } from '../data/portalData';

const users = [
  { id: 1, name: 'Admin User', email: 'admin', password: 'admin123', role: 'admin' },
  { id: 2, name: 'Faculty User', email: 'faculty@school.com', password: 'faculty123', role: 'faculty' }
];

export function loginUser(identifier, password, role = 'student') {
  if (role === 'student') {
    const credential = studentCredentials.find(
      (item) => item.rollNumber.toLowerCase() === identifier.toLowerCase() && item.password === password
    );

    if (!credential) {
      throw new Error('Invalid roll number or password');
    }

    const student = students.find((item) => item.rollNumber === credential.rollNumber);

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      role: 'student',
      rollNumber: student.rollNumber,
      grade: student.grade,
      initials: student.initials
    };
  }

  const user = users.find(
    (item) => item.role === role && item.email.toLowerCase() === identifier.toLowerCase() && item.password === password
  );

  if (!user) {
    throw new Error(`Invalid ${role} credentials`);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };
}

export function signupUser(name, email, password, role = 'student') {
  if (role === 'student') {
    const nextId = students.length + 1;
    const rollNumber = `STU${String(nextId).padStart(3, '0')}`;
    users.push({
      id: users.length + 1,
      name,
      email,
      password,
      role: 'student'
    });

    return {
      id: rollNumber,
      name,
      email,
      role: 'student',
      rollNumber
    };
  }

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
