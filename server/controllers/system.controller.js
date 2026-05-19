import { getSystemUsage } from '../services/system.service.js';

export async function getUsageSnapshot(_request, response, next) {
  try {
    response.json({
      success: true,
      data: await getSystemUsage()
    });
  } catch (error) {
    next(error);
  }
}
