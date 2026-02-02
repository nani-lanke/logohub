let menu =document.querySelector("#header-icon");
let navbar=document.querySelector(".header-bar");
menu.addEventListener("click", function () {
  navbar.classList.toggle("active");
});
window.onscroll = () =>{
  navbar.classList.remove("active")
}

document.addEventListener("DOMContentLoaded", function () {
  Promise.all([
    fetch("https://logohub.info/jobVacancy").then(res => res.json()),
    fetch("https://logohub.info/technologyAndSoftwareServices").then(res => res.json()),
    fetch("https://logohub.info/educationAndInstituteService").then(res => res.json()),
    fetch("https://logohub.info/entertainmentAndInformationService").then(res => res.json()),
    fetch("https://logohub.info/healthCareAndMedicalServices").then(res => res.json()),
    fetch("https://logohub.info/financeAndBankingServices").then(res => res.json()),
    fetch("https://logohub.info/retailAndE_Commerce").then(res => res.json()),
    fetch("https://logohub.info/hotelsTransportFoodandTourism").then(res => res.json()),
    fetch("https://logohub.info/manufacturingIndustries").then(res => res.json()),
    fetch("https://logohub.info/other").then(res => res.json())
  ])
  .then(([jobVacancy, technologyAndSoftwareServices, educationAndInstituteService, entertainmentAndInformationService, healthCareAndMedicalServices, financeAndBankingServices, retailAndE_Commerce, hotelsTransportFoodandTourism, manufacturingIndustries, other]) => {
    generateGrid({ jobVacancy, technologyAndSoftwareServices, educationAndInstituteService, entertainmentAndInformationService, healthCareAndMedicalServices, financeAndBankingServices, retailAndE_Commerce, hotelsTransportFoodandTourism, manufacturingIndustries, other});
  })
  .catch(error => {
    console.error("Error fetching data:", error);
  });
});
  
const colorMap = {
  jobVacancy: '#ff0000',
  technologyAndSoftwareServices: '#0000FF', 
  educationAndInstituteService:'#ffd700',
  entertainmentAndInformationService: '#ff00ff',
  healthCareAndMedicalServices: '#008080',
  financeAndBankingServices: '#ff8000',
  retailAndE_Commerce: '#00bfff',
  hotelsTransportFoodandTourism: '#00ff00',
  manufacturingIndustries: '#000000',
  other: '#FFFFFF',
};
  
function generateGrid(data) {
  const totalScreen = document.getElementById('totalscreen');
  for (let i = 1; i <= 1; i++) {
    const screen = document.createElement('div');
    screen.className = 'screens';
    screen.id = `screen${i}`;
  
    for (let j = 1; j <= 40; j++) {
      const set = document.createElement('div');
      set.className = 'set';
      set.id = `set${j}`;
  
      for (let k = 1; k <= 15; k++) {
        const boxId = 600 * (i - 1) + (j - 1) * 15 + k;
        const box = document.createElement('div');
        box.className = `select${k}`;
        box.id = `box${boxId}`;
  
        let borderColor = 'rgba(0, 0, 0, 0.2)';
  
        if (data.jobVacancy.includes(boxId)) borderColor = colorMap.jobVacancy;
        else if (data.technologyAndSoftwareServices.includes(boxId)) borderColor = colorMap.technologyAndSoftwareServices;
        else if (data.educationAndInstituteService.includes(boxId)) borderColor = colorMap.educationAndInstituteService;
        else if (data.entertainmentAndInformationService.includes(boxId)) borderColor = colorMap.entertainmentAndInformationService;
        else if (data.healthCareAndMedicalServices.includes(boxId)) borderColor = colorMap.healthCareAndMedicalServices;
        else if (data.financeAndBankingServices.includes(boxId)) borderColor = colorMap.financeAndBankingServices;
        else if (data.retailAndE_Commerce.includes(boxId)) borderColor = colorMap.retailAndE_Commerce;
        else if (data.hotelsTransportFoodandTourism.includes(boxId)) borderColor = colorMap.hotelsTransportFoodandTourism;
        else if (data.manufacturingIndustries.includes(boxId)) borderColor = colorMap.manufacturingIndustries;
        else if (data.other.includes(boxId)) borderColor = colorMap.other;

        box.style.border = `2.4px solid ${borderColor}`;
  
        const number = document.createElement('span');
        number.className = 'number';
        number.id = `text${boxId}`;
        number.textContent = (j - 1) * 15 + k;
  
        box.appendChild(number);
        set.appendChild(box);
      }
      screen.appendChild(set);
    }
    totalScreen.appendChild(screen);
  }
  loadImages();
}
  
function loadImages() {
  for (let i = 1; i <= 600; i++) {
    (function (currentIndex) {
      const imageUrl = `/screenone/box${currentIndex}.png`;
      const container = document.getElementById(`box${currentIndex}`);
      const text = document.getElementById(`text${currentIndex}`);
      const image = new Image();
      image.src = imageUrl;
  
      image.onload = function () {
        container.style.backgroundImage = `url(${imageUrl})`;
        text.style.display = "none";
        container.style.backgroundColor = "#FFFFFF";
  
        container.addEventListener("click", function () {
          fetch(`https://logohub.info/image/${currentIndex}`)
          .then(response => response.json())
          .then(data => {
            if (data.link) {
               window.open(data.link, '_blank');
            }
          })
          .catch(error => console.error('Error:', error));
        });
      };
    })(i);
  }
}
  