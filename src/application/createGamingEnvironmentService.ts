import { DualSenseControllerMonitor } from '../activity/DualSenseControllerMonitor';
import { AppConfig, ControllerConfig, SteamConfig, TVConfig } from '../config/config';
import { SteamController } from '../steam/SteamController';
import { Logger } from '../system/Logger';
import { createTVController } from '../tv/createTVController';
import { GamingEnvironmentService } from './GamingEnvironmentService';

interface CreateGamingEnvironmentServiceOptions {
  app: AppConfig;
  controller: ControllerConfig;
  logger: Logger;
  steam: SteamConfig;
  tv: TVConfig;
}

export function createGamingEnvironmentService(options: CreateGamingEnvironmentServiceOptions): GamingEnvironmentService {
  return new GamingEnvironmentService({
    activityMonitor: new DualSenseControllerMonitor(options.app, options.controller, options.logger),
    config: options.app,
    logger: options.logger,
    steam: new SteamController(options.steam, options.logger),
    tv: createTVController(options.tv, options.logger),
    tvInput: options.tv.input
  });
}
