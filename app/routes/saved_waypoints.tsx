export default function SavedWaypoints() {
  // TODO: Replace with actual data and loop
  const waypoints = [
    {
      name: "Summit Peak",
      coordinates: "45.5231° N, 122.6765° W",
    },
    {
      name: "Base Camp",
      coordinates: "45.5123° N, 122.6543° W",
    },
    {
      name: "River Crossing",
      coordinates: "45.5012° N, 122.6321° W",
    },
    {
      name: "Waterfall View",
      coordinates: "45.4901° N, 122.6100° W",
    },
  ];

  return (
    <div
      className="relative flex size-full min-h-screen flex-col bg-slate-50 justify-between group/design-root overflow-x-hidden"
    >
      <div>
        <div className="flex items-center bg-slate-50 p-4 pb-2 justify-between">
          <div
            className="text-[#0d141c] flex size-12 shrink-0 items-center"
            data-icon="ArrowLeft"
            data-size="24px"
            data-weight="regular"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24px"
              height="24px"
              fill="currentColor"
              viewBox="0 0 256 256"
            >
              <path
                d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"
              ></path>
            </svg>
          </div>
          <h2
            className="text-[#0d141c] text-lg font-bold leading-tight tracking-[-0.015em] flex-1 text-center pr-12"
          >
            Waypoints
          </h2>
        </div>
        {/* Waypoint List - In a real app, map over data here */}
        {waypoints.map((waypoint, index) => (
          <div key={index} className="flex items-center gap-4 bg-slate-50 px-4 min-h-[72px] py-2">
            <div
              className="text-[#0d141c] flex items-center justify-center rounded-lg bg-[#e7edf4] shrink-0 size-12"
              data-icon="MapPin"
              data-size="24px"
              data-weight="regular"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24px"
                height="24px"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path
                  d="M128,64a40,40,0,1,0,40,40A40,40,0,0,0,128,64Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,128Zm0-112a88.1,88.1,0,0,0-88,88c0,31.4,14.51,64.68,42,96.25a254.19,254.19,0,0,0,41.45,38.3,8,8,0,0,0,9.18,0A254.19,254.19,0,0,0,174,200.25c27.45-31.57,42-64.85,42-96.25A88.1,88.1,0,0,0,128,16Zm0,206c-16.53-13-72-60.75-72-118a72,72,0,0,1,144,0C200,161.23,144.53,209,128,222Z"
                ></path>
              </svg>
            </div>
            <div className="flex flex-col justify-center">
              <p
                className="text-[#0d141c] text-base font-medium leading-normal line-clamp-1"
              >
                {waypoint.name}
              </p>
              <p
                className="text-[#49739c] text-sm font-normal leading-normal line-clamp-2"
              >
                {waypoint.coordinates}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div>
        <div className="flex justify-end overflow-hidden px-5 pb-5">
          <button
            className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-14 bg-[#0c7ff2] text-slate-50 text-base font-bold leading-normal tracking-[0.015em] min-w-0 px-2 gap-4 pl-4 pr-6"
          >
            <div
              className="text-slate-50"
              data-icon="Plus"
              data-size="24px"
              data-weight="regular"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24px"
                height="24px"
                fill="currentColor"
                viewBox="0 0 256 256"
              >
                <path
                  d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"
                ></path>
              </svg>
            </div>
          </button>
        </div>
        <div className="h-5 bg-slate-50"></div>
      </div>
    </div>
  );
}
