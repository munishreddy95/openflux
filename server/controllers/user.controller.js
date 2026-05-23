import { createManagedUser, issueTemporaryPassword, listUsers } from '../services/auth.service.js';

export async function listAllUsers(_request, response, next) {
  try {
    response.json({
      success: true,
      data: await listUsers()
    });
  } catch (error) {
    next(error);
  }
}

export async function createUserAccount(request, response, next) {
  try {
    const username = request.body?.username;
    const password = request.body?.password;

    if (!username || !password) {
      response.status(400).json({
        success: false,
        message: 'Username and password are required.'
      });
      return;
    }

    const user = await createManagedUser({
      username,
      password,
      createdByUserId: request.user.id
    });

    response.status(201).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
}

export async function createTemporaryPassword(request, response, next) {
  try {
    const result = await issueTemporaryPassword(request.params.id, {
      temporaryPassword: request.body?.temporaryPassword,
      issuedByUserId: request.user.id
    });

    response.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}
