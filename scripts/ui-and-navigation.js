//--------------- Dark Mode toggle logic ---------------

const darkToggle = document.querySelector(".dark-mode-btn i");
const colorText = document.querySelectorAll(".color-text");
const boxElements = document.querySelectorAll(".box");
const root = document.querySelector(":root");

// Default colors for light mode (CSS variables)
const defaultLightModeColors = [
  "#fff",       // --white
  "#000000",    // --text-color
  "#000",       // --primary-color
  "#272B2F",    // --secondary-color
  "#fff"        // --ui-bg
];

// Function to apply theme colors
function applyThemeColors(colors) {
  root.style.setProperty("--white", colors[0]);
  root.style.setProperty("--text-color", colors[1]);
  root.style.setProperty("--primary-color", colors[2]);
  root.style.setProperty("--secondary-color", colors[3]);
  root.style.setProperty("--ui-bg", colors[4]);
}

// Function to toggle dark mode classes
function toggleDarkMode(darkModeStyle) {
  const method = darkModeStyle ? "add" : "remove";
  colorText.forEach(el => el.classList[method]("darkMode"));
  boxElements.forEach(el => el.classList[method]("darkMode"));
}

// Handle dark mode toggle
darkToggle.addEventListener("click", () => {
  const isDarkMode = darkToggle.classList.contains("fa-moon");
  const colorData = darkToggle.getAttribute("data-color").split(" "); // Get color data from the button
  
  if (isDarkMode) {
    // Switch to dark mode
    darkToggle.classList.replace("fa-moon", "fa-sun");
    toggleDarkMode(true);
    applyThemeColors(colorData); // Apply the color theme when dark mode is activated
    darkToggle.parentElement.title = "Light Mode";
    
  } else {
    // Switch to light mode
    darkToggle.classList.replace("fa-sun", "fa-moon");
    toggleDarkMode(false);
    applyThemeColors(defaultLightModeColors); // Apply the default light mode colors
    darkToggle.parentElement.title = "Dark Mode";

  }
});

//--------------- Tab Navigation logic ---------------

const navLinks = document.querySelectorAll(".nav-links a");
const sections = document.querySelectorAll(".page-content");

function handleRouting() {
  const currentHash = window.location.hash || "#homePage";
  const activeSection = document.querySelector(currentHash);
  const parentID = activeSection ? activeSection.getAttribute("data-parent") : null;

  navLinks.forEach(link => {
    const linkHref = link.getAttribute("href");
    const isMatched = (linkHref === currentHash || linkHref === parentID);
    link.classList.toggle("active-nav", isMatched);
  });

  sections.forEach(sec => {
    const isSectionActive = `#${sec.id}` === currentHash;
    
    if (isSectionActive) {
      sec.classList.add("active-section");
      sec.classList.remove("hidden");
    } else {
      sec.classList.remove("active-section");
      sec.classList.add("hidden");
    }
  });

  if (typeof navLinksContainer !== 'undefined' && navLinksContainer) {
    navLinksContainer.classList.remove('show');
  }
}

// ----- View Records Mini Navigation Logic -----

// Listen for the URL changing and page loading
window.addEventListener("hashchange", handleRouting);
window.addEventListener("load", handleRouting);

// 

document.getElementById('customerMenuBtn')?.addEventListener('click', () => {
    document.getElementById('viewRecordsMainMenu').classList.add('hidden');
    document.getElementById('viewRecordsCustomerMenu').classList.remove('hidden');
});

document.getElementById('patientMenuBtn')?.addEventListener('click', () => {
    document.getElementById('viewRecordsMainMenu').classList.add('hidden');
    document.getElementById('viewRecordsPatientMenu').classList.remove('hidden');
});

document.getElementById('viewRecordsCtmBackBtn')?.addEventListener('click', () => {
    document.getElementById('viewRecordsCustomerMenu').classList.add('hidden');
    document.getElementById('viewRecordsMainMenu').classList.remove('hidden');
});

document.getElementById('viewRecordsPtmBackBtn')?.addEventListener('click', () => {
    document.getElementById('viewRecordsPatientMenu').classList.add('hidden');
    document.getElementById('viewRecordsMainMenu').classList.remove('hidden');
});

//--------------- Nav Menu logic for Phones ---------------

const toggle = document.querySelector('.nav-links-menu-toggle');
const navLinksContainer = document.querySelector('.nav-links');

// Toggle mobile menu visibility
toggle.onclick = (e) => {
  e.stopPropagation(); // Prevent the toggle click from immediately closing
  navLinksContainer.classList.toggle('show');
};

// Close nav when clicking outside
document.addEventListener('click', (e) => {
  if (!navLinksContainer.contains(e.target) && !toggle.contains(e.target)) {
    navLinksContainer.classList.remove('show');
  }
});