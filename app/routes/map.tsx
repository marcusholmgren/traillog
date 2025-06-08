export default function Map() {
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
      </div>
      <div>
        <div className="@container flex flex-col h-full flex-1">
          <div className="flex flex-1 flex-col @[480px]:px-4 @[480px]:py-3">
            <div
              className="bg-cover bg-center flex min-h-[320px] flex-1 flex-col justify-between px-4 pb-4 pt-5 @[480px]:rounded-lg @[480px]:px-8 @[480px]:pb-6 @[480px]:pt-8"
              style={{
                backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDl4uk8455gW-BZzCvB2vBXbKskwWj_pciqS84r9Nh5nTO3jRt1Zjs_PNFpbfrHNZfY7mNB34UC8fsP9iLKqKx2tt8k85PsO0S96mbE_pGCI_6EXP8MBhPpYAf-63FdSFKr91Hm8phxMKqAKtPQ6c9jpg89EBVP8exYwalCwxARVqjkIv2h253ln6vr_go2ZqTsT0f2WZJQv-9hm1tl1bbX1NMCeTwllB7wgSQoTksV3k3mGE_nNmPdvPKxmNHS5YgeyZPNdyAulbw')",
              }}
            >
              <label className="flex flex-col min-w-40 h-12">
                <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
                  <div
                    className="text-[#49739c] flex border-none bg-slate-50 items-center justify-center pl-4 rounded-l-lg border-r-0"
                    data-icon="MagnifyingGlass"
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
                        d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"
                      ></path>
                    </svg>
                  </div>
                  <input
                    placeholder="Search for a place"
                    className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg text-[#0d141c] focus:outline-0 focus:ring-0 border-none bg-slate-50 focus:border-none h-full placeholder:text-[#49739c] px-4 rounded-l-none border-l-0 pl-2 text-base font-normal leading-normal"
                    defaultValue=""
                  />
                </div>
              </label>
              <div className="flex flex-col items-end gap-3">
                <div className="flex flex-col gap-0.5">
                  <button
                    className="flex size-10 items-center justify-center rounded-t-lg bg-slate-50 shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                  >
                    <div
                      className="text-[#0d141c]"
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
                  <button
                    className="flex size-10 items-center justify-center rounded-b-lg bg-slate-50 shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                  >
                    <div
                      className="text-[#0d141c]"
                      data-icon="Minus"
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
                          d="M224,128a8,8,0,0,1-8,8H40a8,8,0,0,1,0-16H216A8,8,0,0,1,224,128Z"
                        ></path>
                      </svg>
                    </div>
                  </button>
                </div>
                <button
                  className="flex size-10 items-center justify-center rounded-lg bg-slate-50 shadow-[0_2px_4px_rgba(0,0,0,0.1)]"
                >
                  <div
                    className="text-[#0d141c]"
                    data-icon="NavigationArrow"
                    data-size="24px"
                    data-weight="regular"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24px"
                      height="24px"
                      fill="currentColor"
                      viewBox="0 0 256 256"
                      transform="scale(-1, 1)"
                    >
                      <path
                        d="M229.33,98.21,53.41,33l-.16-.05A16,16,0,0,0,32.9,53.25a1,1,0,0,0,.05.16L98.21,229.33A15.77,15.77,0,0,0,113.28,240h.3a15.77,15.77,0,0,0,15-11.29l23.56-76.56,76.56-23.56a16,16,0,0,0,.62-30.38ZM224,113.3l-76.56,23.56a16,16,0,0,0-10.58,10.58L113.3,224h0l-.06-.17L48,48l175.82,65.22.16.06Z"
                      ></path>
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
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
