let menu =document.querySelector("#header-icon");
let navbar=document.querySelector(".header-bar");
menu.addEventListener("click", function () {
  navbar.classList.toggle("active");
});
window.onscroll = () =>{
  navbar.classList.remove("active")
}

document.addEventListener("DOMContentLoaded", function () {
  const technologyAndSoftwareServices = [10, 11, 12, 13, 14, 15];
  const educationAndInstituteService = [20, 21, 22, 23, 24, 15];
  const hotelsTransportFoodandTourism = [30, 31, 32, 33, 34, 15];
  const energyandUtilityServices = [40, 41, 42, 43, 44, 45];
  const retailAndE_Commerce = [50, 51, 52, 53, 54, 55];
  const entertainmentAndInformationService = [60, 61, 62, 63, 64];
  const healthCareAndMedicalServices = [70, 71, 72, 73, 74, 75];
  const financeAndBankingServices = [80, 81, 82, 83, 84, 85];
  const manufacturingIndustries = [90, 91, 92, 93, 94, 95];
  const other = [100, 101, 102, 103, 104, 105];

  generateGrid({
    technologyAndSoftwareServices,
    educationAndInstituteService,
    hotelsTransportFoodandTourism,
    energyandUtilityServices,
    retailAndE_Commerce,
    entertainmentAndInformationService,
    healthCareAndMedicalServices,
    financeAndBankingServices,
    manufacturingIndustries,
    other
  });
});
  
const colorMap = {
  technologyAndSoftwareServices: '#0000FF', 
  educationAndInstituteService:'#ffd700',
  hotelsTransportFoodandTourism: '#00ff00',
  energyandUtilityServices: '#ff0000',
  retailAndE_Commerce: '#00bfff',
  entertainmentAndInformationService: '#ff00ff',
  healthCareAndMedicalServices: '#008080',
  financeAndBankingServices: '#ff8000',
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
  
        if (data.technologyAndSoftwareServices.includes(boxId)) borderColor = colorMap.technologyAndSoftwareServices;
        else if (data.educationAndInstituteService.includes(boxId)) borderColor = colorMap.educationAndInstituteService;
        else if (data.hotelsTransportFoodandTourism.includes(boxId)) borderColor = colorMap.hotelsTransportFoodandTourism;
        else if (data.energyandUtilityServices.includes(boxId)) borderColor = colorMap.energyandUtilityServices;
        else if (data.retailAndE_Commerce.includes(boxId)) borderColor = colorMap.retailAndE_Commerce;
        else if (data.entertainmentAndInformationService.includes(boxId)) borderColor = colorMap.entertainmentAndInformationService;
        else if (data.healthCareAndMedicalServices.includes(boxId)) borderColor = colorMap.healthCareAndMedicalServices;
        else if (data.financeAndBankingServices.includes(boxId)) borderColor = colorMap.financeAndBankingServices;
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
  
