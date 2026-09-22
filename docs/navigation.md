# **Add navigation**

In this chapter, learn how to add navigation to the Expo app.

Copy page

---

In this chapter, we'll learn Expo Router's fundamentals to create stack navigation and a bottom tab bar with two tabs.

![Watch: Adding navigation in your universal Expo app]()  
[Watch: Adding navigation in your universal Expo app](https://www.youtube.com/watch?v=8336fcFV_T4)  
[Set up file-based routing with Expo Router, create stack navigation between screens, and build a bottom tab bar.](https://www.youtube.com/watch?v=8336fcFV_T4)

## **Expo Router basics**

Expo Router is a file-based routing framework for React Native and web apps. It manages navigation between screens and uses the same components across multiple platforms. To get started, we need to know about the following conventions:

* app directory: A special directory containing only routes and their layouts. Any files added to this directory become a screen inside our native app and a page on the web. In the default template, it is located at src/app.  
* Root layout: The src/app/\_layout.tsx file. It defines shared UI elements such as headers and tab bars so they are consistent between different routes.  
* File name conventions: *Index* file names, such as index.tsx, match their parent directory and do not add a path segment. For example, the index.tsx file in the src/app directory matches / route.  
* A route file exports a React component as its default value. It can use either .js, .jsx, .ts, or .tsx extension.  
* Android, iOS, and web share a unified navigation structure.

The above list is enough for us to get started. For a complete list of features, see [Introduction to Expo Router](https://docs.expo.dev/router/introduction/).

1

## **Add a new screen to the stack**

Let's create a new file named about.tsx inside the src/app directory. It displays the screen name when the user navigates to the /about route.

src/app/about.tsx

Copy

import { Text, View, StyleSheet } from 'react-native';

export default function AboutScreen() {  
  return (  
    \<View style\={styles.container}\>  
      \<Text style\={styles.text}\>About screen\</Text\>  
    \</View\>  
  );  
}

const styles \= StyleSheet.create({  
  container: {  
    flex: 1,  
    backgroundColor: '\#25292e',  
    justifyContent: 'center',  
    alignItems: 'center',  
  },  
  text: {  
    color: '\#fff',  
  },  
});

Show more

Inside src/app/\_layout.tsx:

1. Add a \<Stack.Screen /\> component and an options prop to update the title of the /about route.  
2. Update the /index route's title to Home by adding options prop.

src/app/\_layout.tsx

Copy

import { Stack } from 'expo-router';

export default function RootLayout() {  
  return (  
    \<Stack\>  
      \<Stack.Screen name\="index" options\={{ title: 'Home' }} /\>  
      \<Stack.Screen name\="about" options\={{ title: 'About' }} /\>  
    \</Stack\>  
  );  
}

What is a Stack?

2

## **Navigate between screens**

We'll use Expo Router's Link component to navigate from the /index route to the /about route. It is a React component that renders a \<Text\> with a given href prop.

1. Import the Link component from expo-router inside src/app/index.tsx.  
2. Add a Link component after \<Text\> component and pass href prop with the /about route.  
3. Add a style of fontSize, textDecorationLine, and color to Link component. It takes the same props as the \<Text\> component.

src/app/index.tsx

Copy

import { Text, View, StyleSheet } from 'react-native';  
import { Link } from 'expo-router';

export default function Index() {  
  return (  
    \<View style\={styles.container}\>  
      \<Text style\={styles.text}\>Home screen\</Text\>  
      \<Link href\="/about" style\={styles.button}\>  
        Go to About screen  
      \</Link\>  
    \</View\>  
  );  
}

const styles \= StyleSheet.create({  
  container: {  
    flex: 1,  
    backgroundColor: '\#25292e',  
    alignItems: 'center',  
    justifyContent: 'center',  
  },  
  text: {  
    color: '\#fff',  
  },  
  button: {  
    fontSize: 20,  
    textDecorationLine: 'underline',  
    color: '\#fff',  
  },  
});

Show more

Let's take a look at the changes in our app. Click on Link to navigate to the /about route:

3

## **Add a not-found route**

When a route doesn't exist, we can use a \+not-found route to display a fallback screen. This is useful when we want to display a custom screen when navigating to an invalid route on mobile instead of crashing the app or display a *404* error on web. Expo Router uses a special \+not-found.tsx file to handle this case.

1. Create a new file named \+not-found.tsx inside the src/app directory to add the NotFoundScreen component.  
2. Add options prop from the Stack.Screen to display a custom screen title for this route.  
3. Add a Link component to navigate to the / route, which is our fallback route.

src/app/+not-found.tsx

Copy

import { View, StyleSheet } from 'react-native';  
import { Link, Stack } from 'expo-router';

export default function NotFoundScreen() {  
  return (  
    \<\>  
      \<Stack.Screen options\={{ title: 'Oops\! Not Found' }} /\>  
      \<View style\={styles.container}\>  
        \<Link href\="/" style\={styles.button}\>  
          Go back to Home screen\!  
        \</Link\>  
      \</View\>  
    \</\>  
  );  
}

const styles \= StyleSheet.create({  
  container: {  
    flex: 1,  
    backgroundColor: '\#25292e',  
    justifyContent: 'center',  
    alignItems: 'center',  
  },

  button: {  
    fontSize: 20,  
    textDecorationLine: 'underline',  
    color: '\#fff',  
  },  
});

Show more

To test this, navigate to http:localhost:8081/123 URL in the web browser since it is easy to change the URL path there. The app should display the NotFoundScreen component:

4

## **Add a bottom tab navigator**

At this point, the file structure of our src/app directory looks like the following:

src

 

app

  

\_layout.tsxRoot layout

  

index.tsxmatches route '/'

  

teachers.tsxmatches route '/teachers'

  

\+not-found.tsxmatches route any 404 route

We'll add a bottom tab navigator to our app and use the existing Home and Teachers screens to create a two-tab layout. We'll also use the stack navigator in the Root layout so the \+not-found route displays over any other nested navigators.

### **Tabs in this project**

The project uses `src/components/app-tabs.tsx` for native tabs and `src/components/app-tabs.web.tsx` for web tabs. The four tabs are:

Native tab icons use Expo Symbols with outline and selected variants: `house` / `house.fill` for Home, `person.2` / `person.2.fill` for Teachers, and `info.circle` / `info.circle.fill` for About. Android uses the matching Material Symbols names through the `md` prop. Web renders the same symbols inline with `SymbolView`.

| Tab | Route file | URL |
| --- | --- | --- |
| Home | `src/app/(tabs)/index.tsx` | `/` |
| Teachers | `src/app/(tabs)/teachers.tsx` | `/teachers` |
| About | `src/app/(tabs)/about.tsx` | `/about` |
| History | `src/app/(tabs)/history.tsx` | `/history` |

Each route is registered with a matching `NativeTabs.Trigger`:

```tsx
<NativeTabs.Trigger name="index">
  <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
  <NativeTabs.Trigger.Icon
    src={require('@/assets/images/tabIcons/home.png')}
    renderingMode="template"
  />
</NativeTabs.Trigger>

<NativeTabs.Trigger name="teachers">
  <NativeTabs.Trigger.Label>Teachers</NativeTabs.Trigger.Label>
</NativeTabs.Trigger>

<NativeTabs.Trigger name="about">
  <NativeTabs.Trigger.Label>About</NativeTabs.Trigger.Label>
</NativeTabs.Trigger>
```

The web tab bar uses the same three routes with `TabTrigger` components and `/(tabs)`, `/teachers`, and `/about` hrefs. Teachers is currently an empty route reserved for future content. All tab screens use the shared theme and keep their main content centered with the app's `MaxContentWidth` constraint. Keep each route name and trigger name in sync so Expo Router can resolve every screen on Android, iOS, and web.

1. Inside the src/app directory, add a (tabs) subdirectory. This special directory is used to group routes together and display them in a bottom tab bar.  
2. Create a (tabs)/\_layout.tsx file inside the directory. It will be used to define the tab layout, which is separate from Root layout.  
3. Move the existing index.tsx, teachers.tsx, and about.tsx files inside the (tabs) directory. The structure of src/app directory will look like this:

src

 

app

  

\_layout.tsxRoot layout

  

\+not-found.tsxmatches route any 404 route

  

(tabs)

   

\_layout.tsxTab layout

   

index.tsxmatches route '/'

   
   
teachers.tsxmatches route '/teachers'

   
about.tsxmatches route '/about'

Update the Root layout file to add a (tabs) route:

src/app/\_layout.tsx

Copy

import { Stack } from 'expo-router';

export default function RootLayout() {  
  return (  
    \<Stack\>  
      \<Stack.Screen name\="(tabs)" options\={{ headerShown: false }} /\>  
    \</Stack\>  
  );  
}

Inside (tabs)/\_layout.tsx, add a Tabs component to define the bottom tab layout:

src/app/(tabs)/\_layout.tsx

Copy

import { Tabs } from 'expo-router';

export default function TabLayout() {  
  return (  
    \<Tabs\>  
      \<Tabs.Screen name\="index" options\={{ title: 'Home' }} /\>  
      \<Tabs.Screen name\="teachers" options\={{ title: 'Teachers' }} /\>
      \<Tabs.Screen name\="about" options\={{ title: 'About' }} /\>
    \</Tabs\>  
  );  
}

Let's take a look at our app now to see the new bottom tabs:

![Bottom tab navigator shown on all platforms]()

5

## **Install @expo/vector-icons**

To install the @expo/vector-icons library, stop the development server by pressing Ctrl \+ C in the terminal, then run the following command:

Terminalnpmyarnpnpmbun

Copy

npx expo install @expo/vector-icons

After the installation completes, start the development server again by running npx expo start.

6

## **Update bottom tab navigator appearance**

Right now, the bottom tab navigator looks the same on all platforms but doesn't match the style of our app. For example, the tab bar or header doesn't display a custom icon, and the bottom tab background color doesn't match the app's background color.

Modify the src/app/(tabs)/\_layout.tsx file to add tab bar icons:

1. Import Ionicons icons set from [@expo/vector-icons](https://docs.expo.dev/guides/icons/#expovector-icons) — a library that includes popular icon sets.  
2. Add the tabBarIcon to both the index and teachers routes. This function takes focused and color as params and renders the icon component. From the icon set, we can provide custom icon names.  
3. Add screenOptions.tabBarActiveTintColor to the Tabs component and set its value to \#ffd33d. This will change the color of the tab bar icon and label when active.

src/app/(tabs)/\_layout.tsx

Copy

import { Tabs } from 'expo-router';  
import Ionicons from '@expo/vector-icons/Ionicons';

export default function TabLayout() {  
  return (  
    \<Tabs  
      screenOptions\={{  
        tabBarActiveTintColor: '\#ffd33d',  
      }}  
    \>  
      \<Tabs.Screen  
        name\="index"  
        options\={{  
          title: 'Home',  
          tabBarIcon: ({ color, focused }) \=\> (  
            \<Ionicons name\={focused ? 'home-sharp' : 'home-outline'} color\={color} size\={24} /\>  
          ),  
        }}  
      /\>  
      \<Tabs.Screen  
        name\="teachers"  
        options\={{  
          title: 'Teachers',  
          tabBarIcon: ({ color, focused }) \=\> (  
            \<Ionicons name\={focused ? 'information-circle' : 'information-circle-outline'} color\={color} size\={24}/\>  
          ),  
        }}  
      /\>  
    \</Tabs\>  
  );  
}

Show more

Let's also change the background color of the tab bar and header using screenOptions prop:

src/app/(tabs)/\_layout.tsx

Copy

\<Tabs  
  screenOptions\={{  
    tabBarActiveTintColor: '\#ffd33d',  
    headerStyle: {  
      backgroundColor: '\#25292e',  
    },  
    headerShadowVisible: false,  
    headerTintColor: '\#fff',  
    tabBarStyle: {  
      backgroundColor: '\#25292e',  
    },  
  }}  
\>

In the above code:

* The header's background is set to \#25292e using the headerStyle property. We have also disabled the header's shadow using headerShadowVisible.  
* headerTintColor applies \#fff to the header label  
* tabBarStyle.backgroundColor applies \#25292e to the tab bar

Our app now has a custom bottom tabs navigator:

