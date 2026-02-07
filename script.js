let menu =document.querySelector("#header-icon");
let navbar=document.querySelector(".header-bar");
menu.addEventListener("click", function () {
  navbar.classList.toggle("active");
});
window.onscroll = () =>{
  navbar.classList.remove("active")
}

document.addEventListener("DOMContentLoaded", function () {
  const technologyAndSoftwareServices = [];
  const educationAndInstituteService = [];
  const hotelsTransportFoodandTourism = [];
  const energyandUtilityServices = [];
  const retailAndE_Commerce = [];
  const entertainmentAndInformationService = [76];
  const healthCareAndMedicalServices = [];
  const financeAndBankingServices = [];
  const manufacturingIndustries = [];
  const other = [];

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
 const links = [
    null, //0
    null,null,null,null,null,null,null,null,null,null, //4-10
    null,null,null,null,null,null,null,null,null,null, //11-20
    null,null,null,null,null,null,null,null,null,null, //21-30
    null,null,null,null,null,null,null,null,null,null, //31-40
    null,null,null,null,null,null,null,null,null,null, //41-50
    null,null,null,null,null,null,null,null,null,null, //51-60
    null,null,null,null,null,null,null,null,null,null, //61-70
    null,null,null,null,null,//71-75
    "https://www.logohub.info/",//76
    null,null,null,null, //77-80
    null,null,null,null,null,null,null,null,null,null, //81-90
    null,null,null,null,null,null,null,null,null,null, //91-100
    null,null,null,null,null,null,null,null,null,null, //101-110
    null,null,null,null,null,null,null,null,null,null, //111-120
    "https://www.youtube.com/@Andhraruchulu537",//121
    null,null,null,null,null,null,null,null,null, //122-130
    null,null,null,null,null,null,null,null,null,null, //131-140
    null,null,null,null,null,null,null,null,null,null, //141-150
    "https://www.youtube.com/@KuttiKathaigal2026",//151
    null,//152
    "https://www.youtube.com/@MeowMeowMelodyTV/shorts",//153
    null,null,null,null,//154-157
    "https://www.youtube.com/@sinucartoons",//158
    null,null, //159-160
    null,null,null,null,null,null,null,null,null,null, //161-170
    null,null,null,null,null,null,null,null,null,null, //171-180
    null,null,null,null,null,null,null,null,null,null, //181-190
    null,null,null,null,null,null,null,null,null,null, //191-200
    null,null,null,null,null,null,null,null,null,null, //201-210
    null,null,null,null,null,null,null,null,null,null, //211-220
    null,null,null,null,null,null,null,null,null,null, //221-230
    null,null,null,null,null,null,null,null,null,null, //231-240
    null,null,null,null,null,null,null,null,null,null, //241-250
    null,null,null,null,null,null,null,null,null,null, //251-260
    null,null,null,null,null,null,null,null,null,null, //261-270
    null,null,null,null,null,null,null,null,null,null, //271-280
    null,null,null,null,null,null,null,null,null,null, //281-290
    null,null,null,null,null,null,null,null,null,null, //291-300
    null,null,null,null,null,null,null,null,null,null, //301-310
    null,null,null,null,null,null,null,null,null,null, //311-320
    null,null,null,null,null,null,null,null,null,null, //321-330
    null,null,null,null,null,null,null,null,null,null, //331-340
    null,null,null,null,null,null,null,null,null,null, //341-350
    null,null,null,null,null,null,null,null,null,null, //351-360
    null,null,null,null,null,null,null,null,null,null, //361-370
    null,null,null,null,null,null,null,null,null,null, //371-380
    null,null,null,null,null,null,null,null,null,null, //381-390
    null,null,null,null,null,null,null,null,null,null, //391-400
    null,null,null,null,null,null,null,null,null,null, //401-410
    null,null,null,null,null,null,null,null,null,null, //411-420
    null,null,null,null,null,null,null,null,null,null, //421-430
    null,null,null,null,null,null,null,null,null,null, //431-440
    null,null,null,null,null,null,null,null,null,null, //441-450
    null,null,null,null,null,null,null,null,null,null, //451-460
    null,null,null,null,null,null,null,null,null,null, //461-470
    null,null,null,null,null,null,null,null,null,null, //471-480
    null,null,null,null,null,null,null,null,null,null, //481-490
    null,null,null,null,null,null,null,null,null,null, //491-500
    null,null,null,null,null,null,null,null,null,null, //501-510
    null,null,null,null,null,null,null,null,null,null, //511-520
    null,null,null,null,null,null,null,null,null,null, //521-530
    null,null,null,null,null,null,null,null,null,null, //531-540
    null,null,null,null,null,null,null,null,null,null, //541-550
    null,null,null,null,null,null,null,null,null,null, //551-560
    null,null,null,null,null,null,null,null,null,null, //561-570
    null,null,null,null,null,null,null,null,null,null, //571-580
    null,null,null,null,null,null,null,null,null,null, //581-590
    null,null,null,null,null,null,null,null,null,null, //591-600
  ];

  for (let i = 1; i <= 600; i++) {
    const imageUrl = `/screenone/box${i}.png`;
    const container = document.getElementById(`box${i}`);
    const text = document.getElementById(`text${i}`);

    if (!container) continue;

    const image = new Image();
    image.src = imageUrl;

    image.onload = function () {
      container.style.backgroundImage = `url(${imageUrl})`;
      container.style.backgroundColor = "#FFFFFF";
      if (text) text.style.display = "none";

      // rotate links safely
      const linkIndex = i % links.length;

      container.addEventListener("click", function () {
        const link = links[linkIndex];
        if (link) {
          window.open(link, "_blank");
        }
      });
    };
  }
}
  


