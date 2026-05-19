import { getSafeConfig, updateConfig } from '../services/config.service.js';
import { applyTransferLimits } from '../services/torrent.service.js';

export function getSettings(_request, response) {
  response.json({
    success: true,
    data: getSafeConfig()
  });
}

export async function updateSettings(request, response, next) {
  try {
    const { downloadSpeedLimit, uploadSpeedLimit } = request.body || {};

    if (downloadSpeedLimit === undefined && uploadSpeedLimit === undefined) {
      response.status(400).json({
        success: false,
        message: 'Provide a downloadSpeedLimit or uploadSpeedLimit value'
      });
      return;
    }

    const settings = await updateConfig({
      ...(downloadSpeedLimit !== undefined ? { downloadSpeedLimit } : {}),
      ...(uploadSpeedLimit !== undefined ? { uploadSpeedLimit } : {})
    });

    applyTransferLimits(settings);

    response.json({
      success: true,
      data: settings
    });
  } catch (error) {
    error.statusCode = 400;
    next(error);
  }
}
