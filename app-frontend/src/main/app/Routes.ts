import {RoutingModule} from "@nu-art/thunderstorm/frontend";
import {Playground} from "./pages/Playground";

export const Route_Home = "home";
export const Route_Login = "login";
export const Route_Playground = "playground";

export const registerRoutes = () => {
	RoutingModule.clearRoutes();

	//home route should be declared last
	RoutingModule.addRoute(Route_Home, "/", Playground).setLabel("Home").setExact(false);
};
