# 🐣 Mochignomes

A web application built with **Nuxt 3**, **Pinia** and **Three.js** to take care of your own little mochignomes.  
No accounts, no backend required — everything runs directly in the browser with persistent state!

---

## 🚀 Features

- 🌼 **A 3D mochignome in a meadow**: she reacts, talks, grows up (egg, baby, child, teen, adult) and lives with the time of day.
- 🎮 **Care actions**: eat, wash, play, cuddle, sleep, heal, dance, take photos.
- 📊 **Stats**: hunger, cleanliness, fun, energy, health, with moods (happy, grumpy, sad, sick, tired, sleeping...).
- 😋 **Tastes**: each mochignome has her own likes and dislikes to discover.
- 👗 **Outfits**: clothes and accessories bought in the shop, a wardrobe and a collection.
- ⚽ **Activities**: mini-games in the meadow (race, football, TV on the sofa).
- 🍳 **Cooking**: a fridge, recipes to discover and meals rated with stars.
- 🏠 **Several mochignomes**: a house with nests to unlock; one in the meadow at a time, the others rest.
- 📸 Album, journal, achievements, gentle reminders (notifications or calendar) and installable as a PWA.
- 💾 State persistence with **Pinia + persisted state** (saves stay compatible across updates).

---

## 📦 Local Installation

```bash
git clone https://github.com/your-account/tamagotchi.git
cd tamagotchi
npm install
npm run dev
```

---

## 🧪 Tester rapidement

- `?vitesse=60` : le temps passe 60 fois plus vite (une heure en une minute).
- `?heure=22` : force l'heure affichée pour voir le décor (aube, jour, crépuscule, nuit).
- `/prototype-3d.html` : bac à sable du personnage 3D (expressions, postures, morphing).

---

## ☁️ Déploiement sur Netlify

Le jeu tourne entièrement dans le navigateur (`ssr: false`) et se publie comme un site statique.
Tout est réglé dans `netlify.toml` (commande `npm run generate`, dossier `dist`, Node 22,
redirection monopage, cache du service worker désactivé).

1. Sur [Netlify](https://app.netlify.com/) : **Add new site → Import an existing project → GitHub**, choisir le dépôt.
2. Garder les réglages lus dans `netlify.toml` et lancer le déploiement.
3. Chaque push sur `main` redéploie automatiquement.

---

## 🛠️ Built With

- [Nuxt 3](https://nuxt.com/)
- [Pinia](https://pinia.vuejs.org/)
- [Three.js](https://threejs.org/)
- [Tailwind CSS](https://tailwindcss.com/)

---

## 📚 TODO

- [ ] Add more character animations
- [ ] Add local action history
- [ ] Dark mode

---

## 📄 License

This project is licensed under the **MIT License**.  
Contributions are welcome! 🎉
