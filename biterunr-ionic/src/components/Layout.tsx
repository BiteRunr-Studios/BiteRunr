import {
    IonContent,
    IonIcon,
    IonMenu,
    IonRouterOutlet,
    IonTabBar,
    IonTabButton,
    IonTabs,
} from "@ionic/react";
import HomePage from "../pages/main/HomePage";
import GroupsPage from "../pages/main/GroupsPage";
import ProfilePage from "../pages/main/ProfilePage";
import Header from "./Header";
import { IonReactRouter } from "@ionic/react-router";
import { Redirect, Route } from "react-router";
import { bagOutline, homeOutline, personCircleOutline } from "ionicons/icons";

const Layout: React.FC = () => {
    return (
        <>
            <IonMenu type="overlay" side="end" contentId="main-content">
                <IonContent className="ion-padding">Notifications</IonContent>
            </IonMenu>

            <IonReactRouter>
                <IonTabs>
                    <IonRouterOutlet id="main-content">
                        <Redirect exact path="/" to="/home" />
                        <Route path="/home" render={() => <HomePage />} exact />
                        <Route
                            path="/groups"
                            render={() => <GroupsPage />}
                            exact
                        />
                        <Route
                            path="/profile"
                            render={() => <ProfilePage />}
                            exact
                        />
                    </IonRouterOutlet>

                    <IonTabBar className="pb-4" slot="bottom">
                        <IonTabButton tab="home" href="/home">
                            <IonIcon icon={homeOutline} />
                            Home
                        </IonTabButton>
                        <IonTabButton tab="groups" href="/groups">
                            <IonIcon icon={bagOutline} />
                            Groups
                        </IonTabButton>
                        <IonTabButton tab="profile" href="/profile">
                            <IonIcon icon={personCircleOutline} />
                            Profile
                        </IonTabButton>
                    </IonTabBar>
                </IonTabs>
            </IonReactRouter>
        </>
    );
};

export default Layout;
