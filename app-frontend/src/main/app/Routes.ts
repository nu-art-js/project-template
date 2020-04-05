import {RoutingModule} from "@nu-art/thunderstorm/frontend";
import {SamplePlayground} from "./pages/SamplePlayground";

export const Route_Home = "home";
export const Route_Login = "login";
export const Route_Playground = "playground";

export const registerRoutes = () => {
	RoutingModule.clearRoutes();

	//home route should be declared last
	RoutingModule.addRoute(Route_Home, "/", SamplePlayground).setLabel("Home").setExact(false);
};
