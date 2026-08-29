import { TVConfig } from '../config/config';
import { Logger } from '../system/Logger';
import { LGWebOSController } from './LGWebOSController';
import { MockTVController } from './MockTVController';
import { TVController } from './TVController';

export function createTVController(config: TVConfig, logger: Logger): TVController {
  if (config.provider === 'lg-webos') {
    return new LGWebOSController(config, logger);
  }

  return new MockTVController(logger);
}
