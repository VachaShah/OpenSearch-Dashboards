/*
 * SPDX-License-Identifier: Apache-2.0
 *
 * The OpenSearch Contributors require contributions made to
 * this file be licensed under the Apache-2.0 license or a
 * compatible open source license.
 */

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
 * Modifications Copyright OpenSearch Contributors. See
 * GitHub history for details.
 */

import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import {
  NavigationPublicPluginSetup,
  NavigationPublicPluginStart,
  NavigationPluginStartDependencies,
} from './types';
import { TopNavMenuExtensionsRegistry, createTopNav } from './top-nav-menu';

export class NavigationPublicPlugin
  implements Plugin<NavigationPublicPluginSetup, NavigationPublicPluginStart> {
  private readonly topNavMenuExtensionsRegistry: TopNavMenuExtensionsRegistry = new TopNavMenuExtensionsRegistry();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): NavigationPublicPluginSetup {
    return {
      registerMenuItem: this.topNavMenuExtensionsRegistry.register.bind(
        this.topNavMenuExtensionsRegistry
      ),
    };
  }

  public start(
    { i18n }: CoreStart,
    { data }: NavigationPluginStartDependencies
  ): NavigationPublicPluginStart {
    const extensions = this.topNavMenuExtensionsRegistry.getAll();

    return {
      ui: {
        TopNavMenu: createTopNav(data, extensions, i18n),
      },
    };
  }

  public stop() {}
}
