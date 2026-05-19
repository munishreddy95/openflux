import { getPackageInfo } from '../services/config.service.js';

export function getHealth(_request, response) {
  const packageInfo = getPackageInfo();

  response.json({
    success: true,
    data: {
      status: 'ok',
      app: 'OpenFlux',
      version: packageInfo.version
    }
  });
}
