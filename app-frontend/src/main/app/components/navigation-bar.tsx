/*
 * A typescript & react boilerplate with api call example
 *
 * Copyright (C) 2018  Adam van der Kruk aka TacB0sS
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as React from "react";
import {RoutingModule} from "@nu-art/thunderstorm/frontend";
import {Page_DialogExamples} from "../pages/Page_DialogExamples";
import {Page_Home} from "../pages/Page_Home";
import {css} from "emotion";
import {Page_ToasterExample} from "../pages/Page_ToasterExample";
import {Component_Login} from "@nu-art/user-account/frontend";
import {Page_ApiGen} from "../pages/Page_ApiGen";
import {Page_Dispatch} from "../pages/Page_Dispatch";

const fixedMenu = css`
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 100;
  background-color: rgba(220, 220, 220, 1);
  .menu {
    display: flex;
    padding-top: 15px
    padding-bottom: 15px;
    min-width: 230px;
    min-height: 50px;
    max-width: 950px;
    margin: auto;
    align-items: center;
    justify-content: space-evenly;
    .a {
      text-decoration: none,
      color: #333,
    }
  }
`;
export const Route_ApiGen = "api-generation";
export const Route_Dialog = "dialog";
export const Route_Toaster = "toaster";
export const Route_Login = "login";
export const Route_Home = "home";
export const Route_Dispatch = "test";

const PageLinkKeys = [
	Route_Home,
	Route_Login,
	Route_Dialog,
	Route_Toaster,
	Route_Dispatch,
	Route_ApiGen,
];

export const registerRoutes = () => {
	RoutingModule.clearRoutes();
	RoutingModule.addRoute(Route_ApiGen, "/api-gen", Page_ApiGen).setLabel("Api Generator");
	RoutingModule.addRoute(Route_Dialog, "/dialog", Page_DialogExamples).setLabel("Dialog Examples");
	RoutingModule.addRoute(Route_Toaster, "/toaster", Page_ToasterExample).setLabel("Toaster Examples");
	RoutingModule.addRoute(Route_Login, "/login", Component_Login).setLabel("Login");
	RoutingModule.addRoute(Route_Dispatch, "/dispatch", Page_Dispatch).setLabel("dispatch");
	RoutingModule.addRoute(Route_Home, "/", Page_Home).setLabel("Home").setExact(false);
};

let menuRef: HTMLDivElement;

export class NavigationBar
	extends React.Component {

	render() {
		registerRoutes();

		return <div className="ll_v_l">
			<div className={fixedMenu} ref={(instance: HTMLDivElement) => {
				if (menuRef)
					return;

				menuRef = instance;
				this.forceUpdate();
			}}>
				<div className="menu">
					{RoutingModule.getNavLinks(PageLinkKeys)}
				</div>
			</div>


			{this.renderRoutes()}

		</div>
	}

	renderRoutes = () => {
		if (!menuRef)
			return "";

		return <div style={{padding: menuRef.clientHeight}}>{RoutingModule.getRoutesMap()}</div>;
	};
}

