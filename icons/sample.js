document.addEventListener("DOMContentLoaded", function () {
    Promise.all([
      fetch("https://logohub.info/jobVacancy").then(res => res.json()),
      fetch("https://logohub.info/jobVacancy").then(res => res.json()),
      fetch("https://logohub.info/jobVacancy").then(res => res.json()),
      fetch("https://logohub.info/jobVacancy").then(res => res.json()),
      fetch("https://logohub.info/jobVacancy").then(res => res.json()),
      fetch("https://logohub.info/jobVacancy").then(res => res.json()),
      fetch("https://logohub.info/jobVacancy").then(res => res.json()),
      fetch("https://logohub.info/jobVacancy").then(res => res.json()),
      fetch("https://logohub.info/jobVacancy").then(res => res.json()),
      fetch("https://logohub.info/jobVacancy").then(res => res.json())
    ])
      .then(([jobVacancy, technologyAndSoftwareServices, healthCareAndMedicalServices, financeAndBankingServices, retailAndE_Commerce, manufacturingIndustries, hotelsTransportFoodandTourism, entertainmentAndInformationService, educationAndInstituteService, other]) => {
        generateGrid({jobVacancy, technologyAndSoftwareServices, healthCareAndMedicalServices, financeAndBankingServices, retailAndE_Commerce, manufacturingIndustries, hotelsTransportFoodandTourism, entertainmentAndInformationService, educationAndInstituteService, other});
      })
      .catch(error => {
        console.error("Error fetching data:", error);
      });
  });
  
  const colorMap = {
    jobVacancy: '#ff0000',
    technologyAndSoftwareServices: '#0000FF',    
    healthCareAndMedicalServices: '#008080',
    financeAndBankingServices: '#ff8000',
    retailAndE_Commerce: '#00bfff',
    manufacturingIndustries: '#000000',
    hotelsTransportFoodandTourism: '#00ff00',
    entertainmentAndInformationService: '#ff00ff',
    educationAndInstituteService: '#ffd700',
    other: '#FFFFFF'
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
  
          if (jobVacancy.includes(boxId)) borderColor = colorMap.jobVacancy;
          else if (technologyAndSoftwareServices.includes(boxId)) borderColor = colorMap.technologyAndSoftwareServices;
          else if (healthCareAndMedicalServices.includes(boxId)) borderColor = colorMap.healthCareAndMedicalServices;
          else if (financeAndBankingServices.includes(boxId)) borderColor = colorMap.financeAndBankingServices;
          else if (retailAndE_Commerce.includes(boxId)) borderColor = colorMap.retailAndE_Commerce;
          else if (manufacturingIndustries.includes(boxId)) borderColor = colorMap.manufacturingIndustries;
          else if (hotelsTransportFoodandTourism.includes(boxId)) borderColor = colorMap.hotelsTransportFoodandTourism;
          else if (entertainmentAndInformationService.includes(boxId)) borderColor = colorMap.entertainmentAndInformationService;
          else if (educationAndInstituteService.includes(boxId)) borderColor = colorMap.educationAndInstituteService;
          else if (other.includes(boxId)) borderColor = colorMap.other;
  
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
  